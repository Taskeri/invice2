document.getElementById("cameraInput").addEventListener("change", handleFileUpload);
document.getElementById("uploadInput").addEventListener("change", handleFileUpload);

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const preview = document.getElementById("previewImage");
  const processing = document.getElementById("processing");
  const output = document.getElementById("ocrOutput");
  const form = document.getElementById("invoiceForm");

  if (!file.type.startsWith("image/")) {
    alert("נא לבחור תמונה בלבד.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    preview.src = reader.result;
    preview.style.display = "block";
  };
  reader.readAsDataURL(file);

  processing.style.display = "block";
  output.innerHTML = "";

  try {
    const result = await Tesseract.recognize(file, 'eng+heb', {
      logger: m => console.log(m)
    });

    const text = result.data.text;
    output.textContent = text;
    processing.style.display = "none";
    form.classList.remove("hidden");

    autoFillForm(text);
  } catch (err) {
    console.error("OCR failed:", err);
    processing.textContent = "שגיאה בעיבוד.";
  }
}

function autoFillForm(text) {
  const get = (pattern) => {
    const match = text.match(pattern);
    return match && match[1] ? match[1].trim() : "";
  };

  const invoice = get(/חשבונית(?: מס)?[:\s]*([0-9]+)/i);
  const date = get(/(?:תאריך הפקה|תאריך)[:\s]*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
  const total = get(/(?:סה"?כ|בסכום)[:\s]*([0-9.,]+)/i);
  const vat = get(/מע"?מ[:\s]*([0-9.,]+)/i);

  document.getElementById("invoiceNumber").value = invoice;
  document.getElementById("date").value = date.replace(/\//g, "-");
  document.getElementById("total").value = total.replace(",", "");
  document.getElementById("vat").value = vat.replace(",", "");
  document.getElementById("supplier").value = "";

  markField("invoiceNumber", invoice);
  markField("date", date);
  markField("total", total);
  markField("vat", vat);
  markField("supplier", "");
}

function markField(id, value) {
  const input = document.getElementById(id);
  if (!value) {
    input.style.border = "2px dashed orange";
    input.placeholder = "לא זוהה - נא להשלים";
  } else {
    input.style.border = "1px solid #ccc";
  }
}

document.getElementById("invoiceForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitStatus = document.getElementById("submitStatus");

  const payload = {
    date: document.getElementById("date").value,
    supplier: document.getElementById("supplier").value,
    invoiceNumber: document.getElementById("invoiceNumber").value,
    total: document.getElementById("total").value,
    vat: document.getElementById("vat").value,
    items: document.getElementById("items").value,
    uploadedBy: sessionStorage.getItem("username") || "לא ידוע"
  };

  try {
    const res = await fetch("/submit-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    submitStatus.textContent = data.message;
    submitStatus.style.color = data.success ? "green" : "red";
  } catch (err) {
    console.error("Submit failed:", err);
    submitStatus.textContent = "שגיאה בשליחה לשרת.";
    submitStatus.style.color = "red";
  }
});
