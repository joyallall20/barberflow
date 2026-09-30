import { useCallback, useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Clock3, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  getEmailTemplates,
  getEmailTemplate,
  updateEmailTemplate,
} from "../../services/admin.js";
import {
  EMAIL_TEMPLATE_GROUPS,
  EMAIL_TEMPLATE_LABELS,
} from "../../utils/emailTemplatePreview.js";

import TemplateList from "../../admin/email-templates/TemplateList.jsx";
import TemplateEditor from "../../admin/email-templates/TemplateEditor.jsx";
import EmailPreview from "../../admin/email-templates/EmailPreview.jsx";

const SUPPORTED_ORDER = EMAIL_TEMPLATE_GROUPS.flatMap((group) => group.types);
const AUTOMATION_PATH = "/admin/email-settings";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const EmailTemplatesPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedType = searchParams.get("type");

  const [templates, setTemplates] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [failedType, setFailedType] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [draft, setDraft] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  const requestRef = useRef(0);

  // Fetch one full template. Commits only on success, so a failed switch
  // leaves the current editor (and any unsaved edits) untouched.
  const fetchTemplate = useCallback(async (type) => {
    const requestId = ++requestRef.current;
    setLoadingTemplate(true);
    setFailedType(null);

    try {
      const response = await getEmailTemplate(type);
      if (requestId !== requestRef.current) return false;

      const template = response?.template;
      if (!template) throw new Error("Template not found.");

      setSelectedTemplate(template);
      setSelectedType(type);
      setDraft(null);
      setDirty(false);
      setTemplates((current) =>
        current.map((item) =>
          item.type === template.type ? { ...item, ...template } : item
        )
      );
      return true;
    } catch (err) {
      console.error(err);
      if (requestId === requestRef.current) {
        setFailedType(type);
        toast.error(getErrorMessage(err, "Unable to load this template."));
      }
      return false;
    } finally {
      if (requestId === requestRef.current) setLoadingTemplate(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    setError(null);

    try {
      const response = await getEmailTemplates();

      if (!Array.isArray(response?.templates)) {
        throw new Error("Unexpected response from the server.");
      }

      const list = response.templates.filter(
        (item) => item && typeof item.type === "string"
      );
      setTemplates(list);

      if (list.length === 0) {
        setSelectedTemplate(null);
        setSelectedType(null);
        return;
      }

      const hasType = (type) =>
        typeof type === "string" && list.some((item) => item.type === type);

      const target =
        (hasType(requestedType) && requestedType) ||
        SUPPORTED_ORDER.find((type) => hasType(type)) ||
        list[0].type;

      await fetchTemplate(target);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Unable to load email templates."));
    } finally {
      setLoadingTemplates(false);
    }
  }, [fetchTemplate, requestedType]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // React to ?type= changes (back/forward, deep links) after initial load.
  useEffect(() => {
    if (!requestedType) return;
    if (requestedType === selectedType) return;
    if (!templates.some((item) => item.type === requestedType)) return;

    if (dirty) {
      setPendingAction({ kind: "select", type: requestedType });
      return;
    }

    fetchTemplate(requestedType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedType]);

  // Warn on tab close / reload with unsaved edits.
  useEffect(() => {
    if (!dirty) return undefined;

    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const handleSelect = (type) => {
    if (type === selectedType) return;

    if (dirty) {
      setPendingAction({ kind: "select", type });
      return;
    }

    setSearchParams({ type }, { replace: true });
    fetchTemplate(type);
  };

  const confirmDiscard = () => {
    const action = pendingAction;
    setPendingAction(null);
    if (!action) return;

    if (action.kind === "select") {
      setSearchParams({ type: action.type }, { replace: true });
      fetchTemplate(action.type);
    } else {
      navigate(action.to);
    }
  };

  const handleSave = useCallback(
    async (payload) => {
      if (!selectedType) return false;

      try {
        setSaving(true);

        const response = await updateEmailTemplate(selectedType, payload);
        const updated = response?.template;
        if (!updated) throw new Error("The server returned no template.");

        setSelectedTemplate(updated);
        setTemplates((current) =>
          current.map((item) =>
            item.type === updated.type ? { ...item, ...updated } : item
          )
        );

        toast.success(response?.message || "Email template saved.");
        return true;
      } catch (err) {
        console.error(err);
        toast.error(getErrorMessage(err, "Unable to save the template."));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [selectedType]
  );

  // The preview reads the live draft, never the stale saved copy.
  const previewSource =
    draft && selectedTemplate && draft.type === selectedTemplate.type
      ? draft
      : selectedTemplate;

  const pendingLabel =
    pendingAction?.kind === "select"
      ? EMAIL_TEMPLATE_LABELS[pendingAction.type] || pendingAction.type
      : null;

  const currentLabel =
    EMAIL_TEMPLATE_LABELS[selectedType] || selectedTemplate?.name || null;

  // Show a breadcrumb when the page was opened from a settings row.
  const showBreadcrumb = Boolean(requestedType && currentLabel);

  const renderBody = () => {
    if (loadingTemplates) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center">
          <RefreshCw size={20} className="animate-spin text-amber-500" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="border border-red-500/30 bg-red-500/5 px-6 py-10 text-center">
          <h2 className="text-sm font-extrabold uppercase tracking-[0.15em]">
            Couldn't load templates
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs text-[#8f897e]">{error}</p>
          <button
            type="button"
            onClick={loadTemplates}
            className="mt-5 inline-flex items-center gap-2 border border-amber-500 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500 transition-colors hover:bg-amber-500 hover:text-black"
          >
            <RefreshCw size={13} />
            Retry
          </button>
        </div>
      );
    }

    if (templates.length === 0) {
      return (
        <div className="border border-white/10 bg-[#141311] px-6 py-10 text-center">
          <h2 className="text-sm font-extrabold uppercase tracking-[0.15em]">
            No templates yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs text-[#8f897e]">
            The server returned no email templates.
          </p>
          <button
            type="button"
            onClick={loadTemplates}
            className="mt-5 inline-flex items-center gap-2 border border-white/10 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8f897e] transition-colors hover:border-white/30 hover:text-[#e8e2d6]"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      );
    }

    return (
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1.15fr)_minmax(0,1fr)]">
        <aside>
          <TemplateList
            templates={templates}
            selectedType={selectedType}
            onSelect={handleSelect}
            dirtyType={dirty ? selectedType : null}
          />
        </aside>

        <section className="relative min-w-0">
          <AnimatePresence>
            {pendingAction && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="mb-4 border border-amber-500/40 bg-amber-500/10 px-4 py-4"
              >
                <p className="text-xs leading-relaxed text-[#e8e2d6]">
                  You have unsaved changes.{" "}
                  {pendingLabel
                    ? `Switch to ${pendingLabel} and discard them?`
                    : "Leave this page and discard them?"}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingAction(null)}
                    className="border border-amber-500 bg-amber-500 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-black"
                  >
                    Keep editing
                  </button>
                  <button
                    type="button"
                    onClick={confirmDiscard}
                    className="border border-white/20 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#e8e2d6] hover:border-white/40"
                  >
                    Discard changes
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {selectedTemplate ? (
            <motion.div
              key={selectedTemplate.type}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <TemplateEditor
                key={selectedTemplate.type}
                template={selectedTemplate}
                onSave={handleSave}
                saving={saving}
                onDirtyChange={setDirty}
                onDraftChange={setDraft}
              />
            </motion.div>
          ) : (
            <div className="border border-white/10 bg-[#141311] px-6 py-10 text-center">
              <p className="text-xs text-[#8f897e]">
                {failedType
                  ? "This template couldn't be loaded."
                  : "Select a template to start editing."}
              </p>
              {failedType && (
                <button
                  type="button"
                  onClick={() => fetchTemplate(failedType)}
                  className="mt-4 inline-flex items-center gap-2 border border-amber-500 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500 hover:bg-amber-500 hover:text-black"
                >
                  <RefreshCw size={13} />
                  Retry
                </button>
              )}
            </div>
          )}

          {loadingTemplate && (
            <div className="absolute inset-0 flex items-start justify-center bg-black/40 pt-24">
              <RefreshCw size={18} className="animate-spin text-amber-500" />
            </div>
          )}
        </section>

        <section className="min-w-0 lg:col-span-2 xl:col-span-1 xl:sticky xl:top-6 xl:self-start">
          {previewSource ? (
            <EmailPreview
              subject={previewSource.subject}
              body={previewSource.body}
              templateName={
                EMAIL_TEMPLATE_LABELS[selectedTemplate?.type] ||
                previewSource.name
              }
            />
          ) : (
            <div className="border border-white/10 bg-[#141311] px-6 py-10 text-center text-xs text-[#625f58]">
              The preview appears here once a template is selected.
            </div>
          )}
        </section>
      </div>
    );
  };

  return (
    <div className="min-h-full bg-[#0f0e0d] px-4 py-8 text-[#e8e2d6] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {/* Breadcrumb — only when opened via a settings row */}
            {showBreadcrumb && (
              <nav className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#625f58]">
                <Link
                  to={AUTOMATION_PATH}
                  className="transition-colors hover:text-amber-500"
                >
                  Email Automation
                </Link>
                <ChevronRight size={12} className="text-[#3a3833]" />
                <span className="text-[#e8e2d6]">{currentLabel}</span>
              </nav>
            )}

            <div className="text-[9px] font-semibold uppercase tracking-[0.35em] text-amber-500">
              Marketing
            </div>

            <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">
              Email Templates
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#8f897e]">
              Customize the emails your customers receive throughout their
              journey.
            </p>
          </div>

          <Link
            to={AUTOMATION_PATH}
            onClick={(event) => {
              if (dirty) {
                event.preventDefault();
                setPendingAction({ kind: "navigate", to: AUTOMATION_PATH });
              }
            }}
            className="flex items-center justify-center gap-2 border border-white/10 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500"
          >
            <Clock3 size={14} />
            Automation Settings
          </Link>
        </div>

        {renderBody()}
      </div>
    </div>
  );
};

export default EmailTemplatesPage;