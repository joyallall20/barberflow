import { useMemo } from "react";
import {
  Mail,
  Clock3,
  Check,
  Star,
  RotateCcw,
  Gift,
  Calendar,
  Megaphone,
} from "lucide-react";

import {
  EMAIL_TEMPLATE_GROUPS,
  EMAIL_TEMPLATE_LABELS,
} from "../../utils/emailTemplatePreview.js";

const TYPE_ICONS = {
  "booking-confirmation": Mail,
  "appointment-reminder": Clock3,
  "thank-you": Check,
  "review-request": Star,
  "rebooking-followup": RotateCcw,
  birthday: Gift,
  holiday: Calendar,
  promotion: Megaphone,
};

const TemplateList = ({
  templates = [],
  selectedType = null,
  onSelect,
  loading = false,
  dirtyType = null,
}) => {
  const groups = useMemo(() => {
    const byType = new Map();

    (Array.isArray(templates) ? templates : []).forEach((template) => {
      if (template && typeof template.type === "string") {
        byType.set(template.type, template);
      }
    });

    const known = new Set();

    // Group order comes from EMAIL_TEMPLATE_GROUPS, never from the API.
    const result = EMAIL_TEMPLATE_GROUPS.map((group) => ({
      label: group.label,
      items: group.types
        .map((type) => {
          known.add(type);
          return byType.get(type);
        })
        .filter(Boolean),
    })).filter((group) => group.items.length > 0);

    // Unknown types are shown, not dropped, and never crash the list.
    const others = [...byType.values()].filter(
      (template) => !known.has(template.type),
    );

    if (others.length > 0) {
      result.push({ label: "Other", items: others });
    }

    return result;
  }, [templates]);

  return (
    <nav
      aria-label="Email templates"
      className="max-h-[22rem] overflow-y-auto border border-white/10 bg-[#141311] lg:max-h-[calc(100vh-15rem)]"
    >
      {loading ? (
        <div className="space-y-px p-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-11 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="px-5 py-8 text-center text-xs text-[#8f897e]">
          No email templates found.
        </div>
      ) : (
        groups.map((group) => (
          <div
            key={group.label}
            className="border-b border-white/10 last:border-b-0"
          >
            <div className="px-4 pb-2 pt-4 text-[9px] font-semibold uppercase tracking-[0.3em] text-amber-500">
              {group.label}
            </div>

            <ul className="pb-2">
              {group.items.map((template) => {
                const Icon = TYPE_ICONS[template.type] || Mail;
                const active = template.type === selectedType;
                const enabled = template.enabled === true;
                const label =
                  EMAIL_TEMPLATE_LABELS[template.type] ||
                  template.name ||
                  template.type;

                return (
                  <li key={template.type}>
                    <button
                      type="button"
                      onClick={() => onSelect?.(template.type)}
                      aria-current={active ? "true" : undefined}
                      className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors ${
                        active
                          ? "border-amber-500 bg-amber-500/10 text-[#e8e2d6]"
                          : "border-transparent text-[#8f897e] hover:bg-white/5 hover:text-[#e8e2d6]"
                      }`}
                    >
                      <Icon
                        size={15}
                        className={active ? "text-amber-500" : "text-[#625f58]"}
                      />

                      <span className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-[0.12em]">
                        {label}
                      </span>

                      {dirtyType === template.type && (
                        <span
                          title="Unsaved changes"
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                        />
                      )}

                      <span
                        title={
                          enabled ? "Template enabled" : "Template disabled"
                        }
                        className={`shrink-0 border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em] ${
                          enabled
                            ? "border-amber-500/50 text-amber-500"
                            : "border-white/10 text-[#625f58]"
                        }`}
                      >
                        {enabled ? "On" : "Off"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </nav>
  );
};

export default TemplateList;
