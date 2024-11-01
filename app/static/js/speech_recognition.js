let mediaRecorder;
let audioChunks = [];

function startSpeechRecognition() {
    audioChunks = [];
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
            mediaRecorder.onstop = sendAudioToServer;
            mediaRecorder.start();
            setTimeout(() => {
                if (mediaRecorder.state === "recording") {
                    mediaRecorder.stop();
                }
            }, 3000);
        })
        .catch(error => {
            console.error('Error accessing the microphone:', error);
            alert('マイクへのアクセスに失敗しました。ブラウザの設定を確認してください。');
        });
}

function sendAudioToServer() {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', audioBlob, 'speech.webm');

    axios.post('/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
    .then(response => {
        document.getElementById('transcriptionResult').textContent = response.data.text;
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

document.getElementById('speakButton').addEventListener('click', () => {
    if (!isRecording) {
        startRecording();
        startSpeechRecognition();
    }
});