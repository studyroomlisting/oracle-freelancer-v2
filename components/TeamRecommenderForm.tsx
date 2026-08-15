"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RecommenderAnswers } from "@/lib/teamRecommendation";

const modules: { value: RecommenderAnswers["primaryModule"]; label: string }[] = [
  { value: "FINANCE", label: "Oracle Fusion Finance (ERP)" },
  { value: "HCM", label: "Oracle Fusion HCM" },
  { value: "SCM", label: "Oracle Fusion SCM" },
  { value: "EPM", label: "Oracle EPM" },
];

const yesNoQuestions: { key: keyof Omit<RecommenderAnswers, "primaryModule">; label: string }[] = [
  { key: "procurement", label: "Do you need Procurement?" },
  { key: "inventory", label: "Do you need Inventory management?" },
  { key: "manufacturing", label: "Do you need Manufacturing?" },
  { key: "integrations", label: "Do you need integrations with other systems?" },
  { key: "dataMigration", label: "Do you need data migration from a legacy system?" },
];

export default function TeamRecommenderForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [primaryModule, setPrimaryModule] = useState<RecommenderAnswers["primaryModule"] | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  const totalSteps = 1 + yesNoQuestions.length;

  function selectModule(m: RecommenderAnswers["primaryModule"]) {
    setPrimaryModule(m);
    setStep(1);
  }

  function answerQuestion(key: string, value: boolean) {
    setAnswers((a) => ({ ...a, [key]: value }));
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    } else {
      finish({ ...answers, [key]: value });
    }
  }

  function finish(finalAnswers: Record<string, boolean>) {
    if (!primaryModule) return;
    const params = new URLSearchParams({
      primaryModule,
      procurement: String(!!finalAnswers.procurement),
      inventory: String(!!finalAnswers.inventory),
      manufacturing: String(!!finalAnswers.manufacturing),
      integrations: String(!!finalAnswers.integrations),
      dataMigration: String(!!finalAnswers.dataMigration),
    });
    router.push(`/teams/compare?${params.toString()}`);
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex gap-1 mb-8">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded ${i <= step ? "bg-brand-500" : "bg-neutral-200"}`} />
        ))}
      </div>

      {step === 0 && (
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-4">What are you implementing?</h2>
          <div className="flex flex-col gap-2">
            {modules.map((m) => (
              <button
                key={m.value}
                onClick={() => selectModule(m.value)}
                className="text-left px-4 py-3 rounded border border-neutral-200 hover:border-brand-500 hover:bg-brand-50 text-sm font-medium text-neutral-900"
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step >= 1 && step <= yesNoQuestions.length && (
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-4">{yesNoQuestions[step - 1].label}</h2>
          <div className="flex gap-3">
            <button
              onClick={() => answerQuestion(yesNoQuestions[step - 1].key, true)}
              className="flex-1 px-4 py-3 rounded border border-neutral-200 hover:border-brand-500 hover:bg-brand-50 text-sm font-bold"
            >
              Yes
            </button>
            <button
              onClick={() => answerQuestion(yesNoQuestions[step - 1].key, false)}
              className="flex-1 px-4 py-3 rounded border border-neutral-200 hover:border-neutral-400 text-sm font-bold"
            >
              No
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
