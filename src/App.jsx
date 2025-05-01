import React, { useEffect, useState, useRef } from 'react';

function App() {
    const [videoDevices, setVideoDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [slices, setSlices] = useState([null, null, null, null]);
    const [photo] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        const requestPermissionsAndListDevices = async () => {
            try {
                await navigator.mediaDevices.getUserMedia({ video: true });
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = devices.filter((d) => d.kind === 'videoinput');
                setVideoDevices(videoInputs);
                if (videoInputs.length > 0) {
                    setSelectedDeviceId(videoInputs[0].deviceId);
                }
            } catch (err) {
                console.error('Error accessing devices', err);
            }
        };

        requestPermissionsAndListDevices();
    }, []);

    useEffect(() => {
        const startVideo = async () => {
            if (!selectedDeviceId) return;
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: selectedDeviceId } },
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error('Error starting video stream', err);
            }
        };

        startVideo();
    }, [selectedDeviceId]);

    const drawOverlayLines = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        const ctx = canvas.getContext('2d');
        const width = video.videoWidth;
        const height = video.videoHeight;
        canvas.width = width;
        canvas.height = height;

        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 4;

        const line1 = width * 0.3;
        const line2 = width * 0.7;

        ctx.beginPath();
        ctx.moveTo(line1, 0);
        ctx.lineTo(line1, height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(line2, 0);
        ctx.lineTo(line2, height);
        ctx.stroke();
    };

    useEffect(() => {
        const interval = setInterval(drawOverlayLines, 100);
        return () => clearInterval(interval);
    }, [selectedDeviceId]);

    const captureSlice = async (index) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');

        if (!video || !ctx) return;

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const cropX = vw * 0.3;
        const cropW = vw * 0.4;
        const cropH = vh;

        canvas.width = cropW;
        canvas.height = cropH;

        ctx.drawImage(video, cropX, 0, cropW, cropH, 0, 0, cropW, cropH);

        const dataUrl = canvas.toDataURL('image/png');
        const img = new Image();
        img.src = dataUrl;

        await new Promise((res) => {
            img.onload = () => res();
        });

        const updated = [...slices];
        updated[index] = img;
        setSlices(updated);
    };

    const downloadCombinedImage = () => {
        if (slices.some((s) => !s)) {
            alert('Please capture all 4 slices first.');
            return;
        }

        const width = slices[0].width;
        const height = slices[0].height;

        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = width * 4;
        finalCanvas.height = height;
        const ctx = finalCanvas.getContext('2d');

        slices.forEach((img, i) => {
            ctx.drawImage(img, i * width, 0);
        });

        const finalImage = finalCanvas.toDataURL('image/png');

        const link = document.createElement('a');
        link.href = finalImage;
        link.download = 'combined_slices.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const clearSlices = () => {
        setSlices([null, null, null, null]);
    };

    return (
        <div style={{padding: '1em', fontFamily: 'sans-serif'}}>
            <h1>Minifigure photo generator</h1>

            <label>Select Camera:</label>
            <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
            >
                {videoDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId}`}
                    </option>
                ))}
            </select>

            <div
                style={{
                    position: 'relative',
                    width: '640px',
                    height: '480px',
                    marginTop: '1em',
                    border: '1px solid #ccc',
                }}
            >
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{width: '100%', height: '100%', objectFit: 'cover'}}
                />
                <canvas
                    ref={canvasRef}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                    }}
                />
            </div>

            <div style={{margin: '1em 0'}}>
                {slices.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => captureSlice(i)}
                        style={{marginRight: '10px'}}
                    >
                        Set Slice {i + 1}
                    </button>
                ))}
            </div>

            <div style={{display: 'flex', gap: '10px', marginBottom: '1em'}}>
                {slices.map((img, i) =>
                    img ? (
                        <img
                            key={i}
                            src={img.src}
                            alt={`Slice ${i + 1}`}
                            style={{width: '80px', border: '1px solid #ddd'}}
                        />
                    ) : (
                        <div
                            key={i}
                            style={{
                                width: '80px',
                                height: '60px',
                                background: '#f0f0f0',
                                border: '1px dashed #aaa',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#aaa',
                                fontSize: '12px',
                            }}
                        >
                            Slice {i + 1}
                        </div>
                    )
                )}
            </div>

            <button onClick={downloadCombinedImage} disabled={slices.some((s) => !s)}>
                Download PNG
            </button>

            <button onClick={clearSlices} style={{marginLeft: '10px'}}>
                Clear Slices
            </button>

            {photo && (
                <div style={{marginTop: '1em'}}>
                    <h3>Final Combined Image</h3>
                    <img src={photo} alt="Combined result" style={{maxWidth: '100%'}}/>
                </div>
            )}
        </div>
    );
}

export default App;
