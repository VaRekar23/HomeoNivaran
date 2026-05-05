import { useRef, useState } from "react"
import toast from "react-hot-toast"

export const usePrescriptionPDF = () => {
  const letterheadRef = useRef(null)
  const [generating, setGenerating] = useState(false)

  const generatePDF = async (patientName, consultationId) => {
    if (!letterheadRef.current) {
      toast.error("Could not generate PDF. Please try again.")
      return
    }

    setGenerating(true)
    const loadingToast = toast.loading("Generating prescription PDF...")

    try {
      // Dynamic imports — only load these heavy libraries when needed
      const html2canvas = (await import("html2canvas")).default
      const { jsPDF } = await import("jspdf")

      // Step 1 — Capture the letterhead div as a canvas
      const canvas = await html2canvas(letterheadRef.current, {
        scale: 2,
        // scale: 2 = double resolution = crisp on retina/print
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      })

      // Step 2 — Create PDF in A4 portrait
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      // Step 3 — Calculate dimensions to fit A4
      const imgData = canvas.toDataURL("image/png")
      const pdfWidth = pdf.internal.pageSize.getWidth()   // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight() // 297mm

      const canvasWidth = canvas.width
      const canvasHeight = canvas.height
      const ratio = canvasWidth / canvasHeight

      // Fit to page width, calculate height proportionally
      const imgWidth = pdfWidth
      const imgHeight = pdfWidth / ratio

      // Step 4 — Add image to PDF
      // If content is taller than one page, jsPDF handles it
      if (imgHeight <= pdfHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight)
      } else {
        // Multi-page support for long prescriptions
        let position = 0
        let remainingHeight = imgHeight

        while (remainingHeight > 0) {
          pdf.addImage(
            imgData, "PNG",
            0, position,
            imgWidth, imgHeight
          )
          remainingHeight -= pdfHeight
          position -= pdfHeight
          if (remainingHeight > 0) pdf.addPage()
        }
      }

      // Step 5 — Download the PDF
      const fileName = `prescription_${patientName.replace(/\s+/g, "_")}_${
        String(consultationId).slice(0, 8)
      }.pdf`

      pdf.save(fileName)

      toast.dismiss(loadingToast)
      toast.success("Prescription PDF downloaded!")

    } catch (error) {
      console.error("PDF generation error:", error)
      toast.dismiss(loadingToast)
      toast.error("Failed to generate PDF. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  return { letterheadRef, generating, generatePDF }
}