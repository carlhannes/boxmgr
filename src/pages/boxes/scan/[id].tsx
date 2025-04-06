/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
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
  const [useFileUpload, setUseFileUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Detect iOS device
  const [isIOS, setIsIOS] = useState(false);

  // Check if device is iOS - needed for special camera handling
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);
  }, []);

  // Check media devices and update devices list
  const handleDevices = useCallback((mediaDevices: MediaDeviceInfo[]) => {
    const videoDevices = mediaDevices.filter(device => device.kind === "videoinput");
    setDevices(videoDevices);
    
    // Set default device if we haven't chosen one yet and there are devices available
    if (videoDevices.length > 0 && !deviceId) {
      setDeviceId(videoDevices[0].deviceId);
    }
  }, [deviceId]);

  // Get camera devices on component mount with enhanced error handling
  useEffect(() => {
    // Skip webcam initialization if we're using file upload mode
    if (useFileUpload) return;
    
    // Check if mediaDevices API is available
    if (!navigator.mediaDevices) {
      console.log("mediaDevices API not available");
      // Fall back to file upload mode
      setUseFileUpload(true);
      return;
    }
    
    try {
    // First request camera permission, which may be needed before enumeration works on some browsers
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(() => {
        // After permission is granted, try to enumerate devices if the method exists
        if (typeof navigator.mediaDevices.enumerateDevices === 'function') {
          navigator.mediaDevices.enumerateDevices()
            .then(devices => handleDevices(devices))
            .catch(err => {
              console.error("Error enumerating devices:", err);
              // If enumeration fails but we already have camera permission, we can still use default camera
              setDeviceId('environment');
            });
        } else {
          console.log("enumerateDevices not supported by this browser");
          // Use default camera
          setDeviceId('environment');
        }
      })
      .catch(err => {
        console.error("Error accessing camera:", err);
        // Fall back to file upload mode when camera access is denied
        setUseFileUpload(true);
      });
    } catch (err) {
      console.error("Error in getUserMedia:", err);
      // Fall back to file upload mode on any camera error
      setUseFileUpload(true);
    }
  }, [handleDevices, isIOS, useFileUpload]);

  useEffect(() => {
    if (isAuthenticated && id && !Array.isArray(id)) {
      fetchBoxData(id);
      checkApiKey();
    }
  }, [isAuthenticated, id]);

  // Clean up preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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
  
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file (JPEG, PNG, etc.)');
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
      
      // Clear any previous errors
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !box?.id) {
      return;
    }
    
    // Clear previous messages
    setError(null);
    setSuccess(null);
    setProcessing(true);
    
    try {
      // Read file and convert to base64
      const base64Image = await readFileAsDataURL(selectedFile);
      
      // Send image to API for processing
      const response = await fetch(`/api/boxes/${box.id}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Image }),
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

  // Helper function to read file as data URL
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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
  
  // Switch to file upload mode
  const switchToFileUpload = () => {
    setUseFileUpload(true);
    // Clean up webcam if active
    setDeviceId('');
  };
  
  // Try to use webcam again
  const tryWebcamAgain = () => {
    setUseFileUpload(false);
    setError(null);
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
              {/* Webcam Mode */}
              {!useFileUpload ? (
                <>
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
                          deviceId: deviceId !== 'environment' ? deviceId : undefined,
                          facingMode: deviceId === 'environment' ? "environment" : undefined
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
                    
                    {/* Only show the switch camera button if we actually have multiple devices and we're not on iOS */}
                    {devices.length > 1 && !isIOS && (
                      <button
                        onClick={switchCamera}
                        disabled={processing}
                        className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                      >
                        Switch Camera
                      </button>
                    )}
                    
                    <button
                      onClick={switchToFileUpload}
                      disabled={processing}
                      className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      Upload Photo Instead
                    </button>
                  </div>
                  
                  {devices.length > 0 && !isIOS && (
                    <p className="text-center text-sm text-gray-500 mt-2">
                      Camera: {devices.find(d => d.deviceId === deviceId)?.label || 'Unknown Camera'}
                    </p>
                  )}
                  
                  {isIOS && (
                    <p className="text-center text-sm text-gray-500 mt-2">
                      Using rear camera
                    </p>
                  )}
                </>
              ) : (
                /* File Upload Mode */
                <>
                  <p className="mb-4 text-gray-700">
                    Select an image from your device or take a photo of the box contents.
                  </p>
                  
                  <div className="mb-4">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      className="hidden"
                      id="image-upload"
                    />
                    
                    <div className="flex justify-center mb-4">
                      <label 
                        htmlFor="image-upload" 
                        className="cursor-pointer bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        {isIOS ? 'Take Photo or Select Image' : 'Select Image'}
                      </label>
                    </div>
                    
                    {previewUrl && (
                      <div className="mt-4 rounded-lg overflow-hidden border border-gray-300">
                        <img 
                          src={previewUrl} 
                          alt="Selected preview" 
                          className="w-full h-auto" 
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-4 mb-2">
                    <button
                      onClick={handleUpload}
                      disabled={processing || !selectedFile}
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
                      ) : 'Scan Image'}
                    </button>
                    
                    <button
                      onClick={tryWebcamAgain}
                      disabled={processing}
                      className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      Try Using Webcam
                    </button>
                  </div>
                  
                  <p className="text-center text-sm text-gray-500 mt-2">
                    {isIOS ? 'On iOS, you can take a photo directly or select from your photo library' : 'Select an image from your device to scan'}
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}