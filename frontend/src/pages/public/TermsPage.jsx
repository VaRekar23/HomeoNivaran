import { Link } from "react-router-dom"
import { Leaf, ArrowLeft } from "lucide-react"

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-xl font-bold text-slate-900 mb-3">{title}</h2>
    <div className="text-slate-600 space-y-2 text-sm leading-relaxed">
      {children}
    </div>
  </div>
)

const TermsPage = () => {
  const lastUpdated = "April 2026"

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-primary-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-primary-200 hover:text-white mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">HomeoNivaran</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Terms & Conditions
          </h1>
          <p className="text-primary-200 text-sm">
            Last updated: {lastUpdated}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
          <p className="text-sm text-amber-800">
            <strong>Important:</strong> Please read these terms carefully
            before using HomeoNivaran. By using our services you agree
            to be bound by these terms.
          </p>
        </div>

        <Section title="1. About HomeoNivaran">
          <p>
            HomeoNivaran is an online homeopathy teleconsultation platform
            operated by [Your Business Name] ("we", "us", or "our"),
            connecting patients with qualified homeopathy doctors for
            remote consultations and medicine delivery.
          </p>
          <p>
            Our registered homeopathy doctor holds a BHMS degree and is
            registered with [State Council Name] under registration number
            [REG NUMBER].
          </p>
        </Section>

        <Section title="2. Medical Disclaimer">
          <p>
            <strong>HomeoNivaran is not for emergencies.</strong> If you
            are experiencing a medical emergency, call 112 or visit your
            nearest hospital immediately.
          </p>
          <p>
            Our services are intended for mild to moderate everyday
            conditions only. We do not treat severe, chronic, or
            life-threatening conditions.
          </p>
          <p>
            Information provided on this platform is for educational
            purposes and should not replace professional in-person medical
            advice for serious conditions.
          </p>
          <p>
            Homeopathy is a system of alternative medicine. Results may
            vary. We make no guarantees of treatment outcomes.
          </p>
        </Section>

        <Section title="3. Telemedicine Consent">
          <p>
            By submitting a consultation, you acknowledge and consent to:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              Receiving medical consultation via digital means as per
              the Telemedicine Practice Guidelines 2020 issued by the
              Ministry of Health and Family Welfare, India
            </li>
            <li>
              Your medical information being reviewed by our registered
              doctor to provide you a prescription
            </li>
            <li>
              Understanding the limitations of remote consultation and
              that the doctor may refer you to an in-person visit if needed
            </li>
            <li>
              Being 18 years of age or older, or having parental/guardian
              consent for minors
            </li>
          </ul>
        </Section>

        <Section title="4. Patient Responsibilities">
          <p>You agree to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              Provide accurate and complete health information
            </li>
            <li>
              Inform us of all medications you are currently taking
            </li>
            <li>
              Not misuse the platform for any purpose other than
              genuine health consultations
            </li>
            <li>
              Inform us immediately if your condition worsens
            </li>
            <li>
              Not share your account credentials with others
            </li>
          </ul>
        </Section>

        <Section title="5. Prescriptions & Medicines">
          <p>
            Prescriptions are issued at the sole discretion of our
            registered doctor. We reserve the right to decline any
            consultation request.
          </p>
          <p>
            Medicines are dispensed based on the prescription issued by
            our doctor. We source authentic homeopathy medicines from
            licensed suppliers.
          </p>
          <p>
            Prescription details are confidential and will only be
            revealed to the patient after payment is confirmed.
          </p>
        </Section>

        <Section title="6. Payments & Refunds">
          <p>
            Consultation fees and medicine charges are clearly displayed
            before payment. Prices are inclusive of GST where applicable.
          </p>
          <p><strong>Refund Policy:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              If medicines have not been dispatched: full refund within
              7 business days
            </li>
            <li>
              If medicines are in transit: no refund (contact us for
              damaged goods)
            </li>
            <li>
              Consultation fees are non-refundable once the doctor has
              reviewed your case
            </li>
            <li>
              For damaged or incorrect medicines: full replacement or
              refund within 48 hours of delivery
            </li>
          </ul>
          <p>
            Refunds will be processed to your original payment method
            within 5-7 business days.
          </p>
        </Section>

        <Section title="7. Privacy & Data Protection">
          <p>
            We collect and process your personal and health data to
            provide our services. This is governed by our Privacy Policy.
          </p>
          <p>
            In compliance with the Digital Personal Data Protection Act
            2023:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>We collect only data necessary to provide our services</li>
            <li>
              Your data is stored securely on servers located in India
            </li>
            <li>We do not sell or share your data with third parties</li>
            <li>
              You may request deletion of your account and data by
              contacting us
            </li>
          </ul>
        </Section>

        <Section title="8. Intellectual Property">
          <p>
            All content on HomeoNivaran including the platform design,
            prescription format, and AI-generated questions are the
            intellectual property of [Your Business Name] and may not
            be copied or reproduced without written permission.
          </p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>
            To the maximum extent permitted by law, HomeoNivaran and
            its operators shall not be liable for:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              Any adverse reactions to prescribed homeopathy medicines
            </li>
            <li>
              Treatment outcomes as results vary between individuals
            </li>
            <li>
              Service interruptions due to technical issues
            </li>
            <li>
              Delays in delivery due to courier or logistics issues
            </li>
          </ul>
        </Section>

        <Section title="10. Governing Law">
          <p>
            These terms are governed by the laws of India.
            Any disputes shall be subject to the exclusive jurisdiction
            of courts in [Your City], [Your State].
          </p>
        </Section>

        {/* <Section title="11. Contact & Grievance Officer">
          <p>
            For any complaints, queries, or to exercise your data rights,
            contact our Grievance Officer:
          </p>
          <div className="bg-slate-50 rounded-xl p-4 mt-2">
            <p><strong>[Grievance Officer Name]</strong></p>
            <p>Email: grievance@HomeoNivaran.com</p>
            <p>Phone: +91 XXXXXXXXXX</p>
            <p>Address: [Your Business Address]</p>
            <p className="text-xs text-slate-400 mt-1">
              Complaints are addressed within 30 days of receipt.
            </p>
          </div>
        </Section> */}

        <Section title="11. Changes to Terms">
          <p>
            We reserve the right to update these terms at any time.
            Continued use of HomeoNivaran after changes constitutes
            acceptance of the new terms.
          </p>
        </Section>

        <div className="mt-12 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} HomeoNivaran. All rights reserved.
          </p>
          <div className="flex justify-center gap-4 mt-3">
            <Link
              to="/"
              className="text-xs text-primary-600 hover:underline"
            >
              Home
            </Link>
            <Link
              to="/register"
              className="text-xs text-primary-600 hover:underline"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TermsPage