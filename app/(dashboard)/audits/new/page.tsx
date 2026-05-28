"use client";

import { useState } from "react";

const steps = [
  "General Info",
  "Findings",
  "Risk",
  "Evidence",
  "Action",
  "Final Review",
];

export default function NewAuditPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("high");

  return (
    <div className="p-8 max-w-[1000px] mx-auto">
      {/* Stepper */}
      <div className="bg-white rounded-t-2xl p-8 shadow-soft border-b border-surface-container">
        <div className="flex justify-between items-start">
          {steps.map((step, idx) => (
            <div key={step} className="flex flex-col items-center gap-2 flex-1">
              <div className="flex items-center w-full">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold transition-all ${
                    idx <= currentStep
                      ? "bg-primary text-white shadow-md shadow-primary/30 ring-4 ring-primary/20"
                      : "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  {idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-grow mx-3 transition-all ${
                      idx < currentStep ? "bg-primary" : "bg-surface-variant"
                    }`}
                    style={{ position: "relative", top: "0" }}
                  />
                )}
              </div>
              <span
                className={`font-label-md tracking-tight text-[13px] ${
                  idx <= currentStep
                    ? "font-bold text-primary"
                    : "font-medium text-on-surface-variant"
                }`}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white p-8 shadow-soft space-y-8">
        <div className="border-b border-surface-container pb-4">
          <h3 className="font-headline-md text-on-background mb-1">
            Step {currentStep + 1}: {steps[currentStep]}
          </h3>
          <p className="text-on-surface-variant font-body-md">
            Verify the metadata for the institutional integrity audit.
          </p>
        </div>

        <form className="space-y-6">
          {/* Audit Title */}
          <div className="space-y-1">
            <label className="block font-label-md font-semibold text-on-surface-variant uppercase tracking-wider">
              Audit Title
            </label>
            <input
              type="text"
              defaultValue="Laboratory Safety Audit - Wing A"
              className="w-full border border-outline-variant rounded-xl p-4 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Department */}
            <div className="space-y-1">
              <label className="block font-label-md font-semibold text-on-surface-variant uppercase tracking-wider">
                Department
              </label>
              <select className="w-full border border-outline-variant rounded-xl p-4 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                <option>Diagnostics / Lab A</option>
                <option>Radiology</option>
                <option>Emergency Services</option>
                <option>Pathology</option>
              </select>
            </div>

            {/* Assigned Auditor */}
            <div className="space-y-1">
              <label className="block font-label-md font-semibold text-on-surface-variant uppercase tracking-wider">
                Assigned Auditor
              </label>
              <div className="relative">
                <input
                  type="text"
                  defaultValue="Dr. Sarah J."
                  readOnly
                  className="w-full border border-outline-variant rounded-xl p-4 font-body-md bg-surface-container-low cursor-not-allowed pr-10"
                />
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">
                  lock
                </span>
              </div>
            </div>

            {/* Audit Date */}
            <div className="space-y-1">
              <label className="block font-label-md font-semibold text-on-surface-variant uppercase tracking-wider">
                Audit Date
              </label>
              <input
                type="date"
                defaultValue="2023-11-24"
                className="w-full border border-outline-variant rounded-xl p-4 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="block font-label-md font-semibold text-on-surface-variant uppercase tracking-wider">
                Audit Category
              </label>
              <select className="w-full border border-outline-variant rounded-xl p-4 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                <option>Health & Safety</option>
                <option>Financial Compliance</option>
                <option>Clinical Quality</option>
                <option>Operational Protocol</option>
              </select>
            </div>
          </div>

          {/* Priority Level */}
          <div className="space-y-1">
            <label className="block font-label-md font-semibold text-on-surface-variant uppercase tracking-wider">
              Priority Level
            </label>
            <div className="flex bg-surface-container-low border border-outline-variant/50 rounded-xl p-1 w-fit">
              {(["low", "medium", "high"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setPriority(level)}
                  className={`py-2 px-6 rounded-lg font-body-md capitalize transition-all ${
                    priority === level
                      ? "bg-primary text-white font-bold shadow-sm"
                      : "text-on-surface-variant hover:bg-white"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Upload Section */}
          <div className="space-y-1 pt-4">
            <label className="block font-label-md font-semibold text-on-surface-variant uppercase tracking-wider">
              Initial Evidence (Optional)
            </label>
            <div className="border-2 border-dashed border-outline-variant rounded-2xl p-12 flex flex-col items-center justify-center gap-3 bg-surface-container-lowest hover:bg-surface-container-low transition-colors cursor-pointer group">
              <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[32px]">
                  cloud_upload
                </span>
              </div>
              <div className="text-center">
                <p className="font-body-md font-semibold text-on-surface">
                  Click to upload or drag and drop
                </p>
                <p className="font-label-md text-on-surface-variant">
                  PDF, JPG, PNG or DOCX (max. 10MB)
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Footer Actions */}
      <div className="bg-surface-container-low p-6 rounded-b-2xl shadow-soft flex justify-between items-center border-t border-outline-variant/30">
        <button className="flex items-center gap-2 text-on-surface font-bold px-6 py-3 rounded-xl border border-outline hover:bg-white transition-colors active:scale-95">
          <span className="material-symbols-outlined text-[20px]">drafts</span>
          Save Draft
        </button>
        <button
          onClick={() =>
            currentStep < steps.length - 1 && setCurrentStep(currentStep + 1)
          }
          className="flex items-center gap-2 bg-primary text-white font-bold px-10 py-3 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:bg-primary-container transition-all active:scale-[0.98]"
        >
          {currentStep === steps.length - 1 ? "Submit Audit" : "Next: " + steps[currentStep + 1]}
          <span className="material-symbols-outlined text-[20px]">
            arrow_forward
          </span>
        </button>
      </div>

      {/* Info Cards */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-soft border-t-4 border-secondary">
          <div className="flex items-center gap-2 mb-2 text-secondary">
            <span className="material-symbols-outlined text-[18px]">
              policy
            </span>
            <h4 className="font-label-md font-bold uppercase tracking-wider">
              Audit Policy
            </h4>
          </div>
          <p className="font-body-md text-on-surface-variant leading-relaxed">
            Section 4.2: Health and safety audits must be filed within 48 hours
            of inspection.
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-soft border-t-4 border-tertiary">
          <div className="flex items-center gap-2 mb-2 text-tertiary">
            <span className="material-symbols-outlined text-[18px]">
              warning
            </span>
            <h4 className="font-label-md font-bold uppercase tracking-wider">
              High Risk Flag
            </h4>
          </div>
          <p className="font-body-md text-on-surface-variant leading-relaxed">
            This category requires an executive summary from the Head of
            Diagnostics.
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-soft border-t-4 border-primary">
          <div className="flex items-center gap-2 mb-2 text-primary">
            <span className="material-symbols-outlined text-[18px]">
              description
            </span>
            <h4 className="font-label-md font-bold uppercase tracking-wider">
              Template Used
            </h4>
          </div>
          <p className="font-body-md text-on-surface-variant leading-relaxed">
            Standard Laboratory Safety Protocol V3.4 (Revised Jan 2023)
          </p>
        </div>
      </div>
    </div>
  );
}
