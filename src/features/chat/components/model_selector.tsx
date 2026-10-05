import type { LLMProviderOption } from "@/features/chat/api/chat_api";
import type { LLMSelection } from "@/features/chat/hooks/use_llm_provider";

type ModelSelectorProps = {
  providers: LLMProviderOption[];
  value: LLMSelection | undefined;
  onChange: (next: LLMSelection) => void;
  disabled?: boolean;
};

// <option> values encode both halves of the pick as "provider::model".
const SEP = "::";

export const ModelSelector = ({ providers, value, onChange, disabled }: ModelSelectorProps) => {
  const optionCount = providers.reduce((n, p) => n + p.models.length, 0);
  if (!optionCount) return null;

  const currentProvider = providers.find((p) => p.id === value?.provider);
  const currentModel = currentProvider?.models.find((m) => m.id === value?.model);
  const hasChoice = optionCount > 1;

  return (
    <label className="model_selector" title={currentModel ? `${currentProvider!.label} · ${currentModel.id}` : "Choose model"}>
      <select
        className="model_selector__select"
        value={value ? `${value.provider}${SEP}${value.model}` : ""}
        onChange={(e) => {
          const [provider, model] = e.target.value.split(SEP);
          onChange({ provider, model });
        }}
        disabled={disabled || !hasChoice}
        aria-label="Model"
      >
        {providers.map((p) => (
          <optgroup key={p.id} label={p.label}>
            {p.models.map((m) => (
              <option key={m.id} value={`${p.id}${SEP}${m.id}`}>
                {m.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {hasChoice && (
        <svg className="model_selector__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      )}
    </label>
  );
};
