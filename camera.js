 const VIDEO_ID = "my-fixed-stream-id";

    const peer = new Peer(VIDEO_ID);

    peer.on('open', id => {
      console.log("Peer ID:", id);
      startCamera();
    });

    function startCamera() {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
          document.getElementById('localVideo').srcObject = stream;

          peer.on('call', call => {
            call.answer(stream);
          });
        })
        .catch(error => {
          console.error("Không truy cập được camera:", error);
          alert("Không truy cập được camera.");
        });
    }
