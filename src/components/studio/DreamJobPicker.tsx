import { DREAM_JOBS } from "@/lib/store";
import { Check } from "lucide-react";

interface DreamJobPickerProps {
  selected: string;
  onSelect: (job: string) => void;
}

export function DreamJobPicker({ selected, onSelect }: DreamJobPickerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {DREAM_JOBS.map((job) => {
        const isSelected = selected === job.key;
        return (
          <button
            key={job.key}
            onClick={() => onSelect(job.key)}
            className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              isSelected
                ? "border-primary bg-primary/5 gold-glow"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            {isSelected && (
              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-2.5 w-2.5 text-primary-foreground" />
              </div>
            )}
            <span className="text-2xl">{job.emoji}</span>
            <span className="text-xs font-medium text-center leading-tight">{job.label}</span>
          </button>
        );
      })}
    </div>
  );
}
