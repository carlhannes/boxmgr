import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/authMiddleware';
import { db } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

interface ScanRequestBody {
  image: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fix: Using id from query params instead of boxId
    const { id } = req.query;
    
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: 'Invalid box ID' });
    }

    // Validate box exists
    const boxExists = db.prepare('SELECT id FROM boxes WHERE id = ?').get(id);
    if (!boxExists) {
      return res.status(404).json({ error: 'Box not found' });
    }

    // Get request body and validate image
    const { image } = req.body as ScanRequestBody;
    
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Check if the image is a valid base64 data URL
    if (!image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    // Get API key from settings
    const apiKeySetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('anthropic_api_key') as { value: string } | undefined;
    
    if (!apiKeySetting || !apiKeySetting.value) {
      return res.status(400).json({ error: 'Anthropic API key not found in settings' });
    }

    const apiKey = apiKeySetting.value;

    // Process image with Claude
    const items = await processImageWithClaude(image, apiKey);
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items detected in the image' });
    }

    // Add items to the database
    // Fix: Pass the id variable to addItemsToBox
    const addedItems = addItemsToBox(id, items);

    return res.status(200).json({ 
      success: true, 
      message: 'Items added successfully', 
      addedItems 
    });
  } catch (error) {
    console.error('Error in box scan API:', error);
    return res.status(500).json({ error: 'Failed to process image' });
  }
}

async function processImageWithClaude(imageDataUrl: string, apiKey: string): Promise<string[]> {
  try {
    // Extract base64 data from data URL
    const base64Data = imageDataUrl.split(',')[1];
    
    if (!base64Data) {
      throw new Error('Invalid image data');
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey
    });

    // Create message with image
    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64Data
              }
            },
            {
              type: "text",
              text: "Identify items in this image that would be packed in a moving box. Only include actual physical items. Format your response as a plain list with each item on a new line starting with an asterisk (*). Don't include any other text, explanations or comments. Just the list of items."
            }
          ]
        }
      ]
    });

    // Get the response text
    const contentBlock = message.content[0];
    const responseText = contentBlock.type === 'text' ? contentBlock.text : '';

    // Parse the items from the list format
    return parseItemsList(responseText);
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    throw new Error('Failed to analyze image with Claude');
  }
}

function parseItemsList(text: string): string[] {
  // Split by newline and filter out any empty lines
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  // Process each line to remove asterisk and trim spaces
  return lines.map(line => {
    // Remove * and any leading/trailing whitespace
    const item = line.replace(/^\*\s*/, '').trim();
    return item;
  }).filter(item => item !== '');
}

function addItemsToBox(boxId: string, items: string[]): string[] {
  // Start a transaction to add all items
  const addedItems: string[] = [];
  
  db.transaction(() => {
    for (const itemName of items) {
      // Check if we already have this item in the database
      let item = db.prepare('SELECT id FROM items WHERE name = ? COLLATE NOCASE').get(itemName) as { id: number } | undefined;
      
      // If not, create it - include the boxId as it's required in the actual database schema
      if (!item) {
        // Include boxId in the insert statement to match the actual database schema
        const result = db.prepare('INSERT INTO items (name, boxId) VALUES (?, ?)').run(itemName, boxId);
        item = { id: Number(result.lastInsertRowid) };
      }
      
      // Check if this item is already in the box
      const existingBoxItem = db.prepare(
        'SELECT id FROM box_items WHERE box_id = ? AND item_id = ?'
      ).get(boxId, item.id);
      
      if (!existingBoxItem) {
        // Add the item to the box if it's not already there
        db.prepare(
          'INSERT INTO box_items (box_id, item_id, quantity) VALUES (?, ?, 1)'
        ).run(boxId, item.id);
        
        addedItems.push(itemName);
      }
    }
  })();
  
  return addedItems;
}

export default withAuth(handler);