console.log(
  '👋 This message is being logged by "renderer.js", included via Vite'
);
// document.getElementById("chooseFolderBtn").addEventListener("click", async () => {
//   const folder = await window.api.selectFolder();
//   if (folder) {
//     document.getElementById("folderPath").value = folder;
//   }
// })

// File upload
// document.getElementById("uploadBtn").addEventListener("click", async () => {
//   const input = document.getElementById("fileInput");
//   const file = input.files[0];

//   if (!file) {
//     alert("Please select a file first.");
//     return;
//   }

//   const arrayBuffer = await file.arrayBuffer();   // Read file as binary
//   const uint8Array = new Uint8Array(arrayBuffer); // Convert for IPC

//   console.log("Sending file buffer to main...");

//   const result = await window.api.uploadFile({
//     name: file.name,
//     type: file.type,
//     data: uint8Array
//   });

//   console.log("Main response:", result);
// });

const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");

document.getElementById("uploadBtn").addEventListener("click", async () => {
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a file first.");
    return;
  }

  // 🔒 Disable while processing
  uploadBtn.disabled = true;
  fileInput.disabled = true;
  uploadBtn.innerText = "Processing... ⏳";

  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    console.log("Sending file buffer to main...");

    const result = await window.api.uploadFile({
      name: file.name,
      type: file.type,
      data: uint8Array,
    });

    console.log("Main response:", result);

    // ✅ SUCCESS RESPONSE
    alert(
      "Upload Successful!\n\n" +
        "File: " +
        file.name +
        "\n" +
        "Status: " +
        result.status +
        "\n" +
        (result.message ? "Message: " + result.message : "")
    );
  } catch (err) {
    console.error("Upload failed:", err);

    // ❌ ERROR RESPONSE
    alert("Upload Failed!\n\n" + (err.message ? err.message : "Unknown error"));
  } finally {
    // 🔓 Re-enable after done
    uploadBtn.disabled = false;
    fileInput.disabled = false;
    uploadBtn.innerText = "Upload File";
  }
});
