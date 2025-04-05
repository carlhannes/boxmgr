import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '@/layouts/MainLayout';
import Webcam from 'react-webcam';
import useAuth from '@/lib/useAuth';

interface Box {
  id: number;
  number: number;
  name: string;
}

interface Setting {
  key: string;
  value: string;
  description?: string;
}

export default function ScanBox() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [box, setBox] = useState<Box | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [addedItems, setAddedItems] = useState<string[]>([]);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');
  const webcamRef = useRef<Webcam>(null);

  // Check media devices and update devices list
  const handleDevices = useCallback((mediaDevices: MediaDeviceInfo[]) => {
    const videoDevices = mediaDevices.filter(device => device.kind === "videoinput");
    setDevices(videoDevices);
    
    // Set default device if we haven't chosen one yet and there are devices available
    if (videoDevices.length > 0 && !deviceId) {
      setDeviceId(videoDevices[0].deviceId);
    }
  }, [deviceId]);

  // Get camera devices on component mount
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices()
      .then(devices => handleDevices(devices))
      .catch(err => {
        console.error("Error accessing media devices:", err);
        setError("Unable to access camera devices. Please ensure camera permissions are granted.");
      });
  }, [handleDevices]);

  useEffect(() => {
    if (isAuthenticated && id && !Array.isArray(id)) {
      fetchBoxData(id);
      checkApiKey();
    }
  }, [isAuthenticated, id]);

  const fetchBoxData = async (boxId: string) => {
    try {
      const response = await fetch(`/api/boxes/${boxId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch box data');
      }
      
      const boxData = await response.json();
      setBox(boxData);
    } catch (err) {
      setError('Error loading box data. Please try again.');
      console.error('Error fetching box data:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkApiKey = async () => {
    try {
      const response = await fetch('/api/settings');
      
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      
      const settings = await response.json();
      const apiKeySetting = settings.find((s: Setting) => s.key === 'anthropic_api_key');
      
      if (!apiKeySetting || !apiKeySetting.value) {
        setApiKeyMissing(true);
        setError('Anthropic API key is missing. Please add it in Settings.');
      }
    } catch (err) {
      console.error('Error checking API key:', err);
    }
  };

  const handleCapture = async () => {
    if (!webcamRef.current || !box?.id) {
      return;
    }
    
    // Clear previous messages
    setError(null);
    setSuccess(null);
    setProcessing(true);
    
    try {
      // Capture image
      const imageSrc = webcamRef.current.getScreenshot();
      
      if (!imageSrc) {
        throw new Error('Failed to capture image');
      }
      
      // Send image to API for processing
      const response = await fetch(`/api/boxes/${box.id}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageSrc }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process image');
      }
      
      const result = await response.json();
      setSuccess('Items detected and added to your box!');
      setAddedItems(result.addedItems || []);
      
      // Refresh the page after 3 seconds
      setTimeout(() => {
        router.push(`/boxes/${box.id}`);
      }, 3000);
    } catch (err) {
      console.error('Error in image processing:', err);
      setError(err instanceof Error ? err.message : 'Failed to process image. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Switch camera device
  const switchCamera = () => {
    if (devices.length <= 1) return;
    
    const currentIndex = devices.findIndex(device => device.deviceId === deviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    setDeviceId(devices[nextIndex].deviceId);
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null || loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <MainLayout title={box ? `Scan Box #${box.number}: ${box.name}` : 'Scan Box'}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link 
            href={id ? `/boxes/${id}` : "/boxes"} 
            className="text-blue-600 hover:text-blue-800"
          >
            &larr; Back to Box
          </Link>
        </div>
        
        <h1 className="text-2xl font-bold mb-6">
          {box ? `Scan Box #${box.number}: ${box.name}` : 'Scan Box'}
        </h1>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
            {error}
            {apiKeyMissing && (
              <div className="mt-2">
                <Link 
                  href="/settings" 
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Go to Settings
                </Link>
              </div>
            )}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 p-4 rounded-md mb-4">
            <p>{success}</p>
            {addedItems.length > 0 && (
              <div className="mt-2">
                <p className="font-semibold">Added Items:</p>
                <ul className="list-disc list-inside mt-1">
                  {addedItems.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-2 text-sm">Redirecting back to box...</p>
          </div>
        )}
        
        {!apiKeyMissing && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-4">
              <p className="mb-4 text-gray-700">
                Position your camera to capture the contents of the box, then click Capture to scan for items.
              </p>
              
              <div className="mb-4 bg-black rounded-lg overflow-hidden">
                {deviceId ? (
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    screenshotQuality={0.8}
                    videoConstraints={{
                      deviceId: deviceId,
                      facingMode: "environment"
                    }}
                    className="w-full rounded-lg"
                    style={{ height: 'auto' }}
                  />
              
                ) : (
                  <div className="bg-gray-900 text-white p-8 text-center rounded-lg">
                    No camera found. Please ensure camera permissions are granted.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-4 mb-2">
                <button
                  onClick={handleCapture}
                  disabled={processing || !deviceId}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : 'Capture'}
                </button>
                
                {devices.length > 1 && (
                  <button
                    onClick={switchCamera}
                    disabled={processing}
                    className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    Switch Camera
                  </button>
                )}
              </div>
              
              {devices.length > 0 && (
                <p className="text-center text-sm text-gray-500 mt-2">
                  Camera: {devices.find(d => d.deviceId === deviceId)?.label || 'Unknown Camera'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}