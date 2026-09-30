import { useMemo } from "react";
import { Eye } from "lucide-react";

import {
  replaceSubjectVariables,
  replaceTemplateVariables,
} from "../../utils/emailTemplatePreview.js";

// Elements that can execute code, load documents, or submit data.
const BLOCKED_TAGS =
  "script,iframe,frame,frameset,object,embed,applet,form,input,button,textarea,select,base,meta,link,noscript,template,svg,math";

const URL_ATTRS = [
  "href",
  "src",
  "action",
  "formaction",
  "poster",
  "background",
  "xlink:href",
];

const SAFE_LINK = /^(https?:|mailto:|tel:|#)/i;
const SAFE_SRC = /^(https?:|data:image\/(png|jpe?g|gif|webp);)/i;
const UNSAFE_STYLE =
  /expression\s*\(|javascript:|vbscript:|@import|behavior\s*:|-moz-binding/i;

const sanitizeEmailHtml = (html) => {
  if (!html) return "";

  // DOMParser builds an inert document: scripts do not run and nothing loads.
  const doc = new DOMParser().parseFromString(html, "text/html");

  doc.querySelectorAll(BLOCKED_TAGS).forEach((node) => node.remove());

  doc.querySelectorAll("style").forEach((node) => {
    node.textContent = node.textContent
      .replace(/@import[^;]*;?/gi, "")
      .replace(
        /expression\s*\([^)]*\)|javascript:|-moz-binding[^;]*;?|behavior\s*:[^;]*;?/gi,
        "",
      );
  });

  doc.querySelectorAll("*").forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;

      if (name.startsWith("on") || name === "srcdoc" || name === "srcset") {
        element.removeAttribute(attribute.name);
        return;
      }

      if (URL_ATTRS.includes(name)) {
        // eslint-disable-next-line no-control-regex
        const compact = value.replace(/[\u0000-\u0020\u007f]+/g, "");
        const safe =
          name === "href"
            ? SAFE_LINK.test(compact)
            : name === "src"
              ? SAFE_SRC.test(compact)
              : false;

        if (!safe) element.removeAttribute(attribute.name);
        return;
      }

      if (name === "style" && UNSAFE_STYLE.test(value)) {
        element.removeAttribute(attribute.name);
      }
    });

    // Links are inert in the preview; the real target shows on hover.
    if (element.tagName === "A" && element.hasAttribute("href")) {
      element.setAttribute("title", element.getAttribute("href"));
      element.setAttribute("href", "#");
      element.setAttribute("rel", "noopener noreferrer");
      element.removeAttribute("target");
    }
  });

  // <head> styles are kept; everything else comes from <body>.
  const headStyles = [...doc.head.querySelectorAll("style")]
    .map((node) => node.outerHTML)
    .join("");

  return headStyles + doc.body.innerHTML;
};

const buildSrcDoc = (bodyHtml) => `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src https: data:">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
html,body{margin:0;padding:0}
body{background:#ece8df;padding:24px 12px}
.wrap{max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #d9d3c5;padding:32px 28px;color:#1a1815;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6}
.wrap h1,.wrap h2,.wrap h3{line-height:1.25;margin:0 0 16px}
.wrap h1{font-size:24px}
.wrap h2{font-size:20px}
.wrap h3{font-size:16px}
.wrap p{margin:0 0 16px}
.wrap a{color:#b45309}
.wrap hr{border:0;border-top:1px solid #d9d3c5;margin:24px 0}
.wrap img{max-width:100%;height:auto}
</style>
</head>
<body><div class="wrap">${bodyHtml}</div></body>
</html>`;

const EmailPreview = ({ subject = "", body = "", templateName = "" }) => {
  const resolvedSubject = useMemo(
    () => replaceSubjectVariables(subject),
    [subject],
  );

  const srcDoc = useMemo(() => {
    if (!body || !body.trim()) return "";
    return buildSrcDoc(sanitizeEmailHtml(replaceTemplateVariables(body)));
  }, [body]);

  return (
    <div className="border border-white/10 bg-[#141311]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-amber-500">
          <Eye size={14} />
          <span className="text-[9px] font-semibold uppercase tracking-[0.3em]">
            Preview
          </span>
        </div>

        <span className="border border-white/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.2em] text-[#8f897e]">
          Sample data
        </span>
      </div>

      <div className="border-b border-amber-500/30 bg-amber-500/5 px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-amber-500">
        Preview only. No email is sent from this screen.
      </div>

      <div className="border-b border-white/10 px-4 py-4">
        {templateName && (
          <div className="mb-2 text-[9px] uppercase tracking-[0.2em] text-[#625f58]">
            {templateName}
          </div>
        )}

        <div className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[#625f58]">
          Subject
        </div>

        <div className="mt-1 break-words text-sm font-semibold text-[#e8e2d6]">
          {resolvedSubject || (
            <span className="font-normal text-[#625f58]">(No subject)</span>
          )}
        </div>
      </div>

      {srcDoc ? (
        <iframe
          title="Email preview"
          sandbox=""
          srcDoc={srcDoc}
          referrerPolicy="no-referrer"
          className="block h-[560px] w-full border-0 bg-[#ece8df]"
        />
      ) : (
        <div className="flex h-64 items-center justify-center px-6 text-center text-xs text-[#625f58]">
          The email body is empty. Start writing to see a preview.
        </div>
      )}
    </div>
  );
};

export default EmailPreview;
