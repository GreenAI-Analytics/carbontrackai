"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function WhistleblowerPage() {
  const [orgRef, setOrgRef] = useState("");
  const [reportType, setReportType] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [caseRef, setCaseRef] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!description || description.length < 20) {
      setError("Please provide a detailed description (at least 20 characters).");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/whistleblower", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgRef: orgRef || null,
          reportType: reportType || "General concern",
          description,
          contact: contact || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.caseRef) {
        setCaseRef(data.caseRef);
        setSubmitted(true);
      } else {
        setError(data.error || "Submission failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-green-200 bg-white p-10 shadow-lg text-center">
          <div className="text-5xl mb-4">📢</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Submitted</h1>
          <p className="text-gray-600 mb-6">
            Thank you. Your report has been recorded anonymously.
          </p>
          {caseRef && (
            <div className="rounded-lg bg-gray-50 p-4 mb-6">
              <p className="text-sm text-gray-500">Your reference code:</p>
              <p className="text-2xl font-mono font-bold text-primary-700">{caseRef}</p>
              <p className="text-xs text-gray-400 mt-2">Save this code — you will need it to check the status of your report or provide additional information.</p>
            </div>
          )}
          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800 text-left">
            <p className="font-medium mb-1">What happens next?</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Your report will be acknowledged within <strong>7 days</strong></li>
              <li>An investigation will be conducted confidentially</li>
              <li>You will receive feedback within <strong>3 months</strong></li>
              <li>Retaliation against whistleblowers is strictly prohibited</li>
            </ul>
          </div>
          <Link href="/" className="inline-block mt-6 text-sm text-primary-600 hover:text-primary-700">
            ← Return to homepage
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Whistleblower Report</h1>
          <p className="text-gray-600 text-sm mt-1">
            Submit a confidential report about suspected violations of EU law, unethical conduct, or policy breaches. Your identity is protected under Directive 2019/1937.
          </p>
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 mb-6">
          <strong>Confidentiality:</strong> This submission is anonymous. No IP address or identifying information is stored. If you choose to provide contact details, they will be encrypted and accessible only to the designated whistleblower officer.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Organisation (optional)</label>
            <input type="text" value={orgRef} onChange={(e) => setOrgRef(e.target.value)} placeholder="Name of the organisation this report concerns" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Type of concern</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500">
              <option value="">Select…</option>
              <option value="Fraud or financial misconduct">Fraud or financial misconduct</option>
              <option value="Corruption or bribery">Corruption or bribery</option>
              <option value="Environmental violation">Environmental violation</option>
              <option value="Health & safety concern">Health & safety concern</option>
              <option value="Discrimination or harassment">Discrimination or harassment</option>
              <option value="Data protection / GDPR breach">Data protection / GDPR breach</option>
              <option value="Policy violation">Policy violation</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} required placeholder="Describe what happened, when, where, and who was involved. Include any relevant details or evidence you are aware of." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 resize-vertical" />
            <p className="text-xs text-gray-400 mt-1">Minimum 20 characters. Be as specific as possible.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Contact for follow-up (optional)</label>
            <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or phone number (encrypted at rest)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" />
            <p className="text-xs text-gray-400 mt-1">Providing contact allows us to follow up. This is stored encrypted and only the whistleblower officer can access it.</p>
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button type="submit" disabled={submitting} className="w-full rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60">
            {submitting ? "Submitting…" : "Submit Report Anonymously"}
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-6 text-center">
          Protected under Directive (EU) 2019/1937. Anti-retaliation measures apply.{" "}
          <Link href="/" className="text-primary-600 hover:text-primary-700">Return to homepage</Link>
        </p>
      </div>
    </main>
  );
}
