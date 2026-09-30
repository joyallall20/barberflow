import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  Minus,
  Save,
  RotateCcw,
} from "lucide-react";

import { EMAIL_TEMPLATE_LABELS } from "../../utils/emailTemplatePreview.js";

const FIELDS = ["name", "description", "subject", "body"];
const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

const toForm = (template) => ({
  name: template?.name ?? "",
  description: template?.description ?? "",
  subject: template?.subject ?? "",
  body: template?.body ?? "",
});

const cleanVariable = (value) => String(value).replace(/[{}\s]/g, "");

const extractVariables = (text) =>
  [...String(text || "").matchAll(VARIABLE_PATTERN)].map((match) => match[1]);

const TOOLS = [
  {
    key: "bold",
    label: "Bold",
    icon: Bold,
    before: "<strong>",
    inner: "text",
    after: "</strong>",
  },
  {
    key: "italic",
    label: "Italic",
    icon: Italic,
    before: "<em>",
    inner: "text",
    after: "</em>",
  },
  {
    key: "link",
    label: "Link",
    icon: LinkIcon,
    before: '<a href="{{bookingLink}}">',
    inner: "Book your next appointment",
    after: "</a>",
  },
  {
    key: "paragraph",
    label: "Paragraph",
    text: "P",
    before: "<p>",
    inner: "text",
    after: "</p>\n",
  },
  {
    key: "heading",
    label: "Heading",
    text: "H2",
    before: "<h2>",
    inner: "Heading",
    after: "</h2>\n",
  },
  {
    key: "rule",
    label: "Horizontal rule",
    icon: Minus,
    before: "<hr />\n",
    inner: "",
    after: "",
  },
];

const inputClass =
  "w-full border bg-[#0f0e0d] px-3 py-2.5 text-xs text-[#e8e2d6] outline-none placeholder:text-[#625f58] focus:border-amber-500";

const Field = ({ label, hint, error, children }) => (
  <div>
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <label className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
        {label}
      </label>
      {hint && <span className="text-[9px] text-[#625f58]">{hint}</span>}
    </div>
    {children}
    {error && <p className="mt-1.5 text-[11px] text-red-400">{error}</p>}
  </div>
);

const TemplateEditor = ({
  template,
  onSave,
  saving = false,
  onDirtyChange,
  onDraftChange,
}) => {
  const [form, setForm] = useState(() => toForm(template));
  const [showErrors, setShowErrors] = useState(false);

  const subjectRef = useRef(null);
  const bodyRef = useRef(null);
  const lastFieldRef = useRef("body");
  const selectionRef = useRef({ subject: null, body: null });
  const pendingCaretRef = useRef(null);

  const base = useMemo(() => toForm(template), [template]);

  // Only a new template object (switch or successful save) resets the form.
  useEffect(() => {
    setForm(toForm(template));
    setShowErrors(false);
    selectionRef.current = { subject: null, body: null };
  }, [template]);

  const dirty = useMemo(
    () => FIELDS.some((field) => form[field] !== base[field]),
    [form, base]
  );

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    onDraftChange?.({ ...form, type: template?.type });
  }, [form, template?.type, onDraftChange]);

  // Variables
  const allowedVariables = useMemo(() => {
    const list = Array.isArray(template?.variables)
      ? template.variables
          .filter((value) => typeof value === "string")
          .map(cleanVariable)
          .filter(Boolean)
      : [];
    return [...new Set(list)];
  }, [template]);

  const chipVariables = useMemo(() => {
    if (allowedVariables.length > 0) return allowedVariables;
    return [
      ...new Set([
        ...extractVariables(base.subject),
        ...extractVariables(base.body),
      ]),
    ];
  }, [allowedVariables, base]);

  const unknownVariables = useMemo(() => {
    if (allowedVariables.length === 0) return [];
    const used = new Set([
      ...extractVariables(form.subject),
      ...extractVariables(form.body),
    ]);
    return [...used].filter((name) => !allowedVariables.includes(name));
  }, [allowedVariables, form.subject, form.body]);

  const missingUnsubscribe =
    template?.type === "promotion" && !/unsubscribeLink/.test(form.body);

  // Validation
  const errors = {
    name: form.name.trim() ? "" : "Name is required.",
    subject: form.subject.trim() ? "" : "Subject is required.",
    body: form.body.trim() ? "" : "Email body is required.",
  };
  const hasErrors = Boolean(errors.name || errors.subject || errors.body);

  // Cursor-aware insertion
  const selectionProps = (field) => {
    const track = (event) => {
      selectionRef.current[field] = {
        start: event.target.selectionStart,
        end: event.target.selectionEnd,
      };
      lastFieldRef.current = field;
    };
    return {
      onSelect: track,
      onKeyUp: track,
      onClick: track,
      onFocus: track,
      onBlur: track,
    };
  };

  const insertText = (field, { before, inner = "", after = "" }) => {
    const value = form[field];
    const saved = selectionRef.current[field] || {
      start: value.length,
      end: value.length,
    };
    const start = Math.min(saved.start, value.length);
    const end = Math.min(saved.end, value.length);

    const selected = value.slice(start, end);
    const innerText = selected || inner;
    const next =
      value.slice(0, start) + before + innerText + after + value.slice(end);

    const caretStart = start + before.length;
    const caretEnd = caretStart + innerText.length;

    pendingCaretRef.current = { field, start: caretStart, end: caretEnd };
    selectionRef.current[field] = { start: caretStart, end: caretEnd };
    lastFieldRef.current = field;

    setForm((current) => ({ ...current, [field]: next }));
  };

  // Restore focus and selection after the controlled value updates.
  useLayoutEffect(() => {
    const pending = pendingCaretRef.current;
    if (!pending) return;
    pendingCaretRef.current = null;

    const element =
      pending.field === "subject" ? subjectRef.current : bodyRef.current;

    if (element) {
      element.focus();
      element.setSelectionRange(pending.start, pending.end);
    }
  }, [form]);

  const setField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSave = async () => {
    setShowErrors(true);
    if (hasErrors || !dirty || saving) return;

    await onSave?.({
      name: form.name.trim(),
      description: form.description.trim(),
      subject: form.subject.trim(),
      body: form.body,
    });
  };

  const handleDiscard = () => {
    setForm(base);
    setShowErrors(false);
  };

  const typeLabel = EMAIL_TEMPLATE_LABELS[template?.type] || template?.type;
  const errorBorder = (key) =>
    showErrors && errors[key] ? "border-red-500/60" : "border-white/10";

  return (
    <div className="border border-white/10 bg-[#141311]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-5 py-5 sm:px-6">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.3em] text-amber-500">
            Editing
          </div>
          <h2 className="mt-1 text-lg font-extrabold uppercase tracking-tight text-[#e8e2d6]">
            {typeLabel}
          </h2>
        </div>

        {typeof template?.enabled === "boolean" && (
          <span
            title="Automation timing is managed in Automation Settings"
            className={`border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${
              template.enabled
                ? "border-amber-500/50 text-amber-500"
                : "border-white/10 text-[#8f897e]"
            }`}
          >
            Template {template.enabled ? "enabled" : "disabled"}
          </span>
        )}
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" error={showErrors ? errors.name : ""}>
            <input
              value={form.name}
              onChange={setField("name")}
              placeholder="Internal template name"
              className={`${inputClass} ${errorBorder("name")}`}
            />
          </Field>

          <Field label="Description" hint="Internal only">
            <input
              value={form.description}
              onChange={setField("description")}
              placeholder="What this email is for"
              className={`${inputClass} border-white/10`}
            />
          </Field>
        </div>

        <Field label="Subject" error={showErrors ? errors.subject : ""}>
          <input
            ref={subjectRef}
            value={form.subject}
            onChange={setField("subject")}
            placeholder="Your appointment is confirmed, {{customerName}}"
            className={`${inputClass} ${errorBorder("subject")}`}
            {...selectionProps("subject")}
          />
        </Field>

        {/* Variables */}
        <div>
          <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
            Variables
            <span className="ml-2 normal-case tracking-normal text-[#625f58]">
              Click to insert at the cursor
            </span>
          </div>

          {chipVariables.length === 0 ? (
            <p className="text-[11px] text-[#625f58]">
              This template has no variables.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {chipVariables.map((name) => (
                <button
                  key={name}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() =>
                    insertText(lastFieldRef.current, {
                      before: `{{${name}}}`,
                    })
                  }
                  className="border border-white/10 bg-[#0f0e0d] px-2.5 py-1.5 font-mono text-[11px] text-[#e8e2d6] transition-colors hover:border-amber-500 hover:text-amber-500"
                >
                  {`{{${name}}}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <Field
          label="HTML body"
          hint={`${form.body.length.toLocaleString()} characters`}
          error={showErrors ? errors.body : ""}
        >
          <div className="mb-2 flex flex-wrap gap-1.5">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.key}
                  type="button"
                  title={tool.label}
                  aria-label={tool.label}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    // Toolbar always edits the body, but remember
                    // which field the user was actually in so variable
                    // chips keep targeting the correct field.
                    const previousField = lastFieldRef.current;
                    insertText("body", tool);
                    lastFieldRef.current = previousField;
                  }}
                  className="flex h-8 min-w-8 items-center justify-center border border-white/10 bg-[#0f0e0d] px-2 text-[10px] font-bold text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500"
                >
                  {Icon ? <Icon size={13} /> : tool.text}
                </button>
              );
            })}
          </div>

          <textarea
            ref={bodyRef}
            value={form.body}
            onChange={setField("body")}
            spellCheck={false}
            rows={18}
            placeholder={
              "<p>Hi {{customerName}},</p>\n<p>Your appointment with {{barberName}} is confirmed.</p>"
            }
            className={`${inputClass} ${errorBorder(
              "body"
            )} min-h-[22rem] resize-y font-mono text-[13px] leading-relaxed`}
            {...selectionProps("body")}
          />
        </Field>

        {unknownVariables.length > 0 && (
          <p className="border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-500">
            Not in this template's variable list:{" "}
            <span className="font-mono">
              {unknownVariables.map((name) => `{{${name}}}`).join(", ")}
            </span>
            . They may not be filled in when the email is sent.
          </p>
        )}

        {missingUnsubscribe && (
          <p className="border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-500">
            Promotion emails should include{" "}
            <span className="font-mono">{"{{unsubscribeLink}}"}</span>.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4 sm:px-6">
        <span className="text-[10px] uppercase tracking-[0.15em] text-[#625f58]">
          {dirty ? "Unsaved changes" : "All changes saved"}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!dirty || saving}
            className="flex items-center gap-2 border border-white/10 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f897e] transition-colors hover:border-white/30 hover:text-[#e8e2d6] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={13} />
            Discard
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-2 border border-amber-500 bg-amber-500 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={13} />
            {saving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;