import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/authMiddleware';
import { db } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

interface ScanRequestBody {
  image: string;
}

interface BoxDetails {
  id: number;
  name: string;
  number?: number;
  categoryId?: number;
  categoryName?: string;
}

interface Item {
  id: number;
  name: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: 'Invalid box ID' });
    }

    // Get box details including category
    const boxDetails = getBoxDetails(id);
    
    if (!boxDetails) {
      return res.status(404).json({ error: 'Box not found' });
    }

    // Get existing items in the box
    const existingItems = getBoxItems(id);

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

    // Process image with Claude, providing box context and existing items
    const items = await processImageWithClaude(image, apiKey, boxDetails, existingItems);
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No new items detected in the image' });
    }

    // Add items to the database
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

// Get box details including its category
function getBoxDetails(boxId: string): BoxDetails | null {
  try {
    // Join with categories to get category name
    const box = db.prepare(`
      SELECT 
        b.id, 
        b.name, 
        b.number,
        b.categoryId,
        c.name as categoryName
      FROM boxes b
      LEFT JOIN categories c ON b.categoryId = c.id
      WHERE b.id = ?
    `).get(boxId) as BoxDetails | undefined;
    
    return box || null;
  } catch (error) {
    console.error('Error getting box details:', error);
    return null;
  }
}

// Get all existing items in a box
function getBoxItems(boxId: string): Item[] {
  try {
    return db.prepare(`
      SELECT i.id, i.name
      FROM items i
      JOIN box_items bi ON i.id = bi.item_id
      WHERE bi.box_id = ?
    `).all(boxId) as Item[];
  } catch (error) {
    console.error('Error getting box items:', error);
    return [];
  }
}

async function processImageWithClaude(
  imageDataUrl: string, 
  apiKey: string, 
  boxDetails: BoxDetails,
  existingItems: Item[]
): Promise<string[]> {
  try {
    // Extract base64 data from data URL
    const base64Data = imageDataUrl.split(',')[1];
    
    if (!base64Data) {
      throw new Error('Invalid image data');
    }

    // Prepare context about the box and its contents
    const boxName = boxDetails.name || 'Unknown';
    const boxNumber = boxDetails.number ? `#${boxDetails.number}` : '';
    const category = boxDetails.categoryName || 'Uncategorized';
    
    // Create a list of existing items
    const existingItemsList = existingItems.map(item => item.name).join('\n- ');
    const existingItemsContext = existingItems.length > 0 
      ? `\nThis box already contains the following items:\n- ${existingItemsList}`
      : '\nThis box is currently empty.';

    // Check for language preference in settings
    const languageSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('scan_language') as { value: string } | undefined;
    
    // Determine what language instruction to include
    let languageInstruction = '3. If the existing items are in a specific language (not English), use that SAME language for new items';
    
    if (languageSetting && languageSetting.value) {
      languageInstruction = `3. ALWAYS respond in ${languageSetting.value} language`;
    }
    
    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey
    });

    // Create message with image and enhanced context
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
              text: `I'm looking at the contents for Box ${boxNumber} "${boxName}" in the category "${category}".${existingItemsContext}

Please identify items visible in this image that would be relevant to pack in this box, considering its category.

Important instructions:
1. DO NOT include items that are already in the box list above
2. Only include physical items visible in the image
${languageInstruction}
4. Format your response as a plain list with each item on a new line starting with an asterisk (*)
5. Don't include any other text, explanations or comments - ONLY the list of new items
6. If no new items are detected or all visible items are already in the list, just respond with "* No new items detected"

Example response format:
* Item 1
* Item 2
* Item 3`
            }
          ]
        }
      ]
    });

    // Get the response text
    const contentBlock = message.content[0];
    const responseText = contentBlock.type === 'text' ? contentBlock.text : '';

    // Parse the items from the list format
    const parsedItems = parseItemsList(responseText);
    
    // Filter out "No new items detected" responses
    return parsedItems.filter(item => item.toLowerCase() !== 'no new items detected');
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