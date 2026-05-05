import { forwardRef } from "react"
import { formatDate } from "../../utils/formatters"

// ── This component renders the visual letterhead ──
// It's hidden on screen but used by html2canvas to generate PDF
// forwardRef lets the parent pass a ref to capture this DOM element

const PrescriptionLetterhead = forwardRef(({ caseData, prescription }, ref) => {
  const today = new Date()

  return (
    <div
      ref={ref}
      style={{
        width: "794px",           // A4 width in pixels at 96dpi
        minHeight: "1123px",      // A4 height in pixels at 96dpi
        backgroundColor: "#ffffff",
        fontFamily: "Georgia, 'Times New Roman', serif",
        color: "#1a1a1a",
        padding: "48px 56px",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* ── Header ── */}
      <div style={{
        borderBottom: "3px solid #1E40AF",
        paddingBottom: "20px",
        marginBottom: "24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}>
        {/* Left — Clinic info */}
        <div>
          <div style={{
            fontSize: "28px",
            fontWeight: "bold",
            color: "#1E40AF",
            letterSpacing: "-0.5px",
            marginBottom: "4px",
          }}>
            HomeoNivaran
          </div>
          <div style={{
            fontSize: "13px",
            color: "#475569",
            marginBottom: "2px",
          }}>
            Online Homeopathy Consultation
          </div>
          <div style={{
            fontSize: "12px",
            color: "#64748B",
          }}>
            www.homeonivaran.in
          </div>
        </div>

        {/* Right — Doctor info */}
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontSize: "18px",
            fontWeight: "bold",
            color: "#1a1a1a",
          }}>
            {caseData?.doctor_name || "Dr. Swapnali"}
          </div>
          <div style={{
            fontSize: "13px",
            color: "#475569",
            marginTop: "2px",
          }}>
            BHMS, PGDEMS
          </div>
          <div style={{
            fontSize: "12px",
            color: "#64748B",
            marginTop: "4px",
          }}>
            Reg. No: 82046
          </div>
          <div style={{
            fontSize: "12px",
            color: "#64748B",
          }}>
            Mumbai, Maharashtra
          </div>
        </div>
      </div>

      {/* ── Prescription label + date ── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
      }}>
        <div style={{
          backgroundColor: "#EFF6FF",
          border: "1px solid #BFDBFE",
          borderRadius: "6px",
          padding: "6px 16px",
          fontSize: "13px",
          fontWeight: "bold",
          color: "#1E40AF",
          letterSpacing: "2px",
        }}>
          PRESCRIPTION
        </div>
        <div style={{ fontSize: "13px", color: "#475569" }}>
          Date: {formatDate(today)}
        </div>
      </div>

      {/* ── Patient details box ── */}
      <div style={{
        border: "1px solid #E2E8F0",
        borderRadius: "8px",
        padding: "16px 20px",
        marginBottom: "24px",
        backgroundColor: "#F8FAFC",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "10px",
      }}>
        {[
          ["Patient Name", caseData?.member_name],
          ["Age / Gender", `${caseData?.member_age} yrs / ${caseData?.member_gender}`],
          ["Condition", caseData?.ailment_name],
          ["Category", caseData?.ailment_category],
          [
            "Known Allergies",
            caseData?.member_known_allergies || "None",
          ],
          [
            "Consultation ID",
            String(caseData?.id || "").slice(0, 8).toUpperCase(),
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <div style={{
              fontSize: "10px",
              color: "#94A3B8",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "2px",
            }}>
              {label}
            </div>
            <div style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "#1E293B",
            }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Rx Symbol + Medicines ── */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{
          fontSize: "32px",
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          color: "#1E40AF",
          marginBottom: "12px",
          lineHeight: "1",
        }}>
          Rx
        </div>

        <div style={{ borderLeft: "3px solid #BFDBFE", paddingLeft: "20px" }}>
          {prescription?.items?.map((item, index) => (
            <div
              key={item.id}
              style={{
                marginBottom: "20px",
                paddingBottom: "16px",
                borderBottom:
                  index < prescription.items.length - 1
                    ? "1px dashed #E2E8F0"
                    : "none",
              }}
            >
              {/* Medicine name + potency */}
              <div style={{
                display: "flex",
                alignItems: "baseline",
                gap: "10px",
                marginBottom: "6px",
              }}>
                <span style={{
                  fontSize: "11px",
                  color: "#94A3B8",
                  fontWeight: "bold",
                  minWidth: "20px",
                }}>
                  {index + 1}.
                </span>
                <span style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#1E293B",
                  fontStyle: "italic",
                }}>
                  {item.medicine_name}
                </span>
                {item.potency && (
                  <span style={{
                    fontSize: "13px",
                    color: "#1E40AF",
                    fontWeight: "600",
                  }}>
                    {item.potency}
                  </span>
                )}
                <span style={{
                  fontSize: "11px",
                  color: "#94A3B8",
                  backgroundColor: "#F1F5F9",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  marginLeft: "auto",
                }}>
                  {item.medicine_category}
                </span>
              </div>

              {/* Sig — dosage instructions */}
              <div style={{
                marginLeft: "28px",
                fontSize: "13px",
                color: "#475569",
                lineHeight: "1.8",
              }}>
                {item.dosage && (
                  <span>
                    <strong>Sig:</strong> {item.dosage}
                    {" "}
                  </span>
                )}
                {item.frequency && (
                  <span>— {item.frequency} </span>
                )}
                {item.duration && (
                  <span>× {item.duration}</span>
                )}
                {item.instructions && (
                  <div style={{
                    marginTop: "2px",
                    fontSize: "12px",
                    color: "#64748B",
                    fontStyle: "italic",
                  }}>
                    Note: {item.instructions}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Doctor's notes ── */}
      {prescription?.doctor_notes && (
        <div style={{
          backgroundColor: "#EFF6FF",
          border: "1px solid #BFDBFE",
          borderRadius: "8px",
          padding: "14px 18px",
          marginBottom: "32px",
        }}>
          <div style={{
            fontSize: "11px",
            fontWeight: "bold",
            color: "#1E40AF",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: "6px",
          }}>
            General Advice
          </div>
          <div style={{
            fontSize: "13px",
            color: "#1E293B",
            lineHeight: "1.6",
          }}>
            {prescription.doctor_notes}
          </div>
        </div>
      )}

      {/* ── Signature area ── */}
      <div style={{
        display: "flex",
        justifyContent: "flex-end",
        marginBottom: "16px",
      }}>
        <div style={{ textAlign: "center", minWidth: "200px" }}>
          <div style={{
            borderTop: "2px solid #1a1a1a",
            paddingTop: "8px",
            marginTop: "48px",
          }}>
            <div style={{
              fontSize: "14px",
              fontWeight: "bold",
              color: "#1a1a1a",
            }}>
              {caseData?.doctor_name || "Dr. Swapnali"}
            </div>
            <div style={{
              fontSize: "11px",
              color: "#64748B",
              marginTop: "2px",
            }}>
              BHMS, PGDEMS
            </div>
            <div style={{
              fontSize: "11px",
              color: "#64748B",
            }}>
              Reg. No: 82046
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        borderTop: "1px solid #E2E8F0",
        paddingTop: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{
          fontSize: "10px",
          color: "#94A3B8",
          maxWidth: "400px",
          lineHeight: "1.5",
        }}>
          This prescription is valid for 30 days from the date of issue.
          For queries, contact: contact@homeonivaran.in
        </div>
        <div style={{
          fontSize: "10px",
          color: "#94A3B8",
          textAlign: "right",
        }}>
          <div>HomeoNivaran · Online Consultation</div>
          <div>
            Generated on {formatDate(today)}
          </div>
        </div>
      </div>

      {/* ── Watermark ── */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%) rotate(-45deg)",
        fontSize: "80px",
        fontWeight: "bold",
        color: "rgba(30, 64, 175, 0.04)",
        letterSpacing: "8px",
        pointerEvents: "none",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}>
        HOMEONIVARAN
      </div>
    </div>
  )
})

PrescriptionLetterhead.displayName = "PrescriptionLetterhead"

export default PrescriptionLetterhead