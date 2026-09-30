import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Clock3,
  Star,
  RotateCcw,
  Gift,
  Megaphone,
  Save,
  RefreshCw,
  Check,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import {
  getEmailSettings,
  updateEmailSettings,
} from "../../services/admin.js";
import { templatePath } from "../../utils/emailTemplateRoutes.js";

const DEFAULT_SETTINGS = {
  automationEnabled: true,
  timezone: "America/Chicago",

  beforeAppointment: {
    bookingConfirmation: {
      enabled: true,
      delayMinutes: 0,
    },
    appointmentReminder: {
      enabled: true,
      minutesBefore: 60,
    },
  },

  afterAppointment: {
    thankYou: {
      enabled: true,
      delayMinutes: 0,
    },
    reviewRequest: {
      enabled: true,
      delayMinutes: 30,
    },
  },

  followupWinback: {
    enabled: false,
    delayDays: 30,
  },

  specialOccasions: {
    birthday: {
      enabled: false,
      daysBefore: 0,
    },
    holiday: {
      enabled: false,
    },
  },

  promotions: {
    enabled: false,
  },
};

const Section = ({ icon: Icon, eyebrow, title, description, children }) => (
  <section className="border border-white/10 bg-[#141311]">
    <div className="border-b border-white/10 px-5 py-5 sm:px-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-amber-500">
          <Icon size={18} />
        </div>

        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.3em] text-amber-500">
            {eyebrow}
          </div>

          <h2 className="mt-1 text-lg font-extrabold uppercase tracking-tight text-[#e8e2d6]">
            {title}
          </h2>

          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#8f897e]">
            {description}
          </p>
        </div>
      </div>
    </div>

    <div className="divide-y divide-white/10">{children}</div>
  </section>
);

const SettingRow = ({
  title,
  description,
  enabled,
  onToggle,
  templateType,
  children,
}) => (
  <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 md:flex-row md:items-center md:justify-between">
    <div className="min-w-0">
      <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#e8e2d6]">
        {title}
      </h3>

      <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#8f897e]">
        {description}
      </p>
    </div>

    <div className="flex flex-wrap items-center gap-3">
      {children}

      {templateType && (
        <Link
          to={templatePath(templateType)}
          className="flex h-8 items-center gap-2 border border-white/10 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500"
        >
          <FileText size={12} />
          Set Template
        </Link>
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        className={`flex h-8 min-w-[76px] items-center justify-center gap-2 border px-3 text-[9px] font-bold uppercase tracking-[0.18em] transition-colors ${
          enabled
            ? "border-amber-500 bg-amber-500 text-black"
            : "border-white/10 text-[#8f897e] hover:border-white/30 hover:text-[#e8e2d6]"
        }`}
      >
        {enabled && <Check size={12} />}
        {enabled ? "Enabled" : "Disabled"}
      </button>
    </div>
  </div>
);

const NumberInput = ({ value, onChange, suffix, disabled }) => (
  <label className="flex items-center border border-white/10 bg-[#0f0e0d]">
    <input
      type="number"
      min="0"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-20 bg-transparent px-3 py-2 text-xs text-[#e8e2d6] outline-none disabled:opacity-40"
    />
    <span className="border-l border-white/10 px-3 py-2 text-[9px] uppercase tracking-[0.15em] text-[#625f58]">
      {suffix}
    </span>
  </label>
);

const EmailSettingsPage = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);

      const response = await getEmailSettings();

      if (response?.settings) {
        setSettings((current) => ({
          ...current,
          ...response.settings,
          beforeAppointment: {
            ...current.beforeAppointment,
            ...response.settings.beforeAppointment,
          },
          afterAppointment: {
            ...current.afterAppointment,
            ...response.settings.afterAppointment,
          },
          followupWinback: {
            ...current.followupWinback,
            ...response.settings.followupWinback,
          },
          specialOccasions: {
            ...current.specialOccasions,
            ...response.settings.specialOccasions,
          },
          promotions: {
            ...current.promotions,
            ...response.settings.promotions,
          },
        }));
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          "Unable to load email settings."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateNested = (section, field, value, nestedField) => {
    setSettings((current) => {
      if (nestedField) {
        return {
          ...current,
          [section]: {
            ...current[section],
            [field]: {
              ...current[section][field],
              [nestedField]: value,
            },
          },
        };
      }

      return {
        ...current,
        [section]: {
          ...current[section],
          [field]: value,
        },
      };
    });
  };

  const toggle = (section, field, nestedField) => {
    const currentValue = nestedField
      ? settings[section][field][nestedField]
      : settings[section][field];

    updateNested(section, field, !currentValue, nestedField);
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      const payload = {
        automationEnabled: settings.automationEnabled,
        timezone: settings.timezone,

        beforeAppointment: settings.beforeAppointment,
        afterAppointment: settings.afterAppointment,
        followupWinback: settings.followupWinback,
        specialOccasions: settings.specialOccasions,
        promotions: settings.promotions,
      };

      const response = await updateEmailSettings(payload);

      if (response?.settings) {
        setSettings((current) => ({
          ...current,
          ...response.settings,
        }));
      }

      toast.success("Email automation settings saved.");
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          "Unable to save email settings."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <RefreshCw size={20} className="animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0f0e0d] px-4 py-8 text-[#e8e2d6] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.35em] text-amber-500">
              Marketing
            </div>

            <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">
              Email Automation
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#8f897e]">
              Control the emails customers receive throughout their
              appointment and retention journey.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/email-templates"
              className="flex items-center justify-center gap-2 border border-white/10 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500"
            >
              <FileText size={14} />
              All Templates
            </Link>

            <button
              type="button"
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center justify-center gap-2 border border-amber-500 bg-amber-500 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

        {/* Global controls */}
        <div className="mb-6 border border-amber-500/30 bg-amber-500/5 p-5 sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 text-amber-500" size={19} />

              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.3em] text-amber-500">
                  Global Control
                </div>

                <h2 className="mt-1 text-lg font-extrabold uppercase">
                  Email Automation
                </h2>

                <p className="mt-1 text-xs text-[#8f897e]">
                  Master switch for automated customer emails.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setSettings((current) => ({
                  ...current,
                  automationEnabled: !current.automationEnabled,
                }))
              }
              className={`flex h-10 items-center justify-center gap-2 border px-5 text-[10px] font-bold uppercase tracking-[0.2em] ${
                settings.automationEnabled
                  ? "border-amber-500 bg-amber-500 text-black"
                  : "border-white/10 text-[#8f897e]"
              }`}
            >
              {settings.automationEnabled
                ? "Automation Active"
                : "Automation Paused"}
            </button>
          </div>
        </div>

        {/* Timezone */}
        <div className="mb-6 border border-white/10 bg-[#141311] p-5 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Clock3 size={16} className="text-amber-500" />

                <h2 className="text-xs font-bold uppercase tracking-[0.15em]">
                  Business Timezone
                </h2>
              </div>

              <p className="mt-1 text-xs text-[#8f897e]">
                Appointment reminders are scheduled using this timezone.
              </p>
            </div>

            <input
              value={settings.timezone}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  timezone: event.target.value,
                }))
              }
              placeholder="America/Chicago"
              className="w-full border border-white/10 bg-[#0f0e0d] px-3 py-2 text-xs text-[#e8e2d6] outline-none focus:border-amber-500 md:w-64"
            />
          </div>
        </div>

        <div className="space-y-6">
          {/* Before appointment */}
          <Section
            icon={Clock3}
            eyebrow="01 / Before Appointment"
            title="Appointment Emails"
            description="Keep customers informed from the moment they book until they arrive."
          >
            <SettingRow
              title="Booking Confirmation"
              description="Send an email after a new appointment is successfully created."
              enabled={
                settings.beforeAppointment.bookingConfirmation.enabled
              }
              onToggle={() =>
                toggle(
                  "beforeAppointment",
                  "bookingConfirmation",
                  "enabled"
                )
              }
              templateType="bookingConfirmation"
            >
              <NumberInput
                value={
                  settings.beforeAppointment.bookingConfirmation.delayMinutes
                }
                onChange={(value) =>
                  updateNested(
                    "beforeAppointment",
                    "bookingConfirmation",
                    value,
                    "delayMinutes"
                  )
                }
                suffix="min delay"
                disabled={
                  !settings.beforeAppointment.bookingConfirmation.enabled
                }
              />
            </SettingRow>

            <SettingRow
              title="Appointment Reminder"
              description="Automatically remind customers before their appointment."
              enabled={
                settings.beforeAppointment.appointmentReminder.enabled
              }
              onToggle={() =>
                toggle(
                  "beforeAppointment",
                  "appointmentReminder",
                  "enabled"
                )
              }
              templateType="appointmentReminder"
            >
              <NumberInput
                value={
                  settings.beforeAppointment.appointmentReminder.minutesBefore
                }
                onChange={(value) =>
                  updateNested(
                    "beforeAppointment",
                    "appointmentReminder",
                    value,
                    "minutesBefore"
                  )
                }
                suffix="min before"
                disabled={
                  !settings.beforeAppointment.appointmentReminder.enabled
                }
              />
            </SettingRow>
          </Section>

          {/* After appointment */}
          <Section
            icon={Star}
            eyebrow="02 / After Appointment"
            title="Retention Emails"
            description="Turn completed appointments into reviews, relationships, and repeat visits."
          >
            <SettingRow
              title="Thank You"
              description="Send a thank-you email after the appointment is completed."
              enabled={settings.afterAppointment.thankYou.enabled}
              onToggle={() =>
                toggle("afterAppointment", "thankYou", "enabled")
              }
              templateType="thankYou"
            >
              <NumberInput
                value={settings.afterAppointment.thankYou.delayMinutes}
                onChange={(value) =>
                  updateNested(
                    "afterAppointment",
                    "thankYou",
                    value,
                    "delayMinutes"
                  )
                }
                suffix="min delay"
                disabled={!settings.afterAppointment.thankYou.enabled}
              />
            </SettingRow>

            <SettingRow
              title="Review Request"
              description="Ask the customer for feedback after their completed service."
              enabled={settings.afterAppointment.reviewRequest.enabled}
              onToggle={() =>
                toggle("afterAppointment", "reviewRequest", "enabled")
              }
              templateType="reviewRequest"
            >
              <NumberInput
                value={settings.afterAppointment.reviewRequest.delayMinutes}
                onChange={(value) =>
                  updateNested(
                    "afterAppointment",
                    "reviewRequest",
                    value,
                    "delayMinutes"
                  )
                }
                suffix="min delay"
                disabled={!settings.afterAppointment.reviewRequest.enabled}
              />
            </SettingRow>
          </Section>

          {/* Winback */}
          <Section
            icon={RotateCcw}
            eyebrow="03 / Retention"
            title="Win-Back"
            description="Reconnect with customers who have not returned after their previous service."
          >
            <SettingRow
              title="Rebooking Follow-Up"
              description="Send a follow-up after the configured number of days."
              enabled={settings.followupWinback.enabled}
              onToggle={() => toggle("followupWinback", "enabled")}
              templateType="winback"
            >
              <NumberInput
                value={settings.followupWinback.delayDays}
                onChange={(value) =>
                  updateNested("followupWinback", "delayDays", value)
                }
                suffix="days"
                disabled={!settings.followupWinback.enabled}
              />
            </SettingRow>
          </Section>

          {/* Special occasions */}
          <Section
            icon={Gift}
            eyebrow="04 / Special Occasions"
            title="Personal Moments"
            description="Use customer information to create timely relationship-building emails."
          >
            <SettingRow
              title="Birthday"
              description="Enable birthday email automation."
              enabled={settings.specialOccasions.birthday.enabled}
              onToggle={() =>
                toggle("specialOccasions", "birthday", "enabled")
              }
              templateType="birthday"
            >
              <NumberInput
                value={settings.specialOccasions.birthday.daysBefore}
                onChange={(value) =>
                  updateNested(
                    "specialOccasions",
                    "birthday",
                    value,
                    "daysBefore"
                  )
                }
                suffix="days before"
                disabled={!settings.specialOccasions.birthday.enabled}
              />
            </SettingRow>

            <SettingRow
              title="Holiday Emails"
              description="Enable holiday-based email automation."
              enabled={settings.specialOccasions.holiday.enabled}
              onToggle={() =>
                toggle("specialOccasions", "holiday", "enabled")
              }
              templateType="holiday"
            />
          </Section>

          {/* Promotions */}
          <Section
            icon={Megaphone}
            eyebrow="05 / Marketing"
            title="Promotions"
            description="Enable promotional email functionality for future campaigns."
          >
            <SettingRow
              title="Promotional Emails"
              description="Allow promotional email automation to be enabled."
              enabled={settings.promotions.enabled}
              onToggle={() => toggle("promotions", "enabled")}
              templateType="promotion"
            />
          </Section>
        </div>

        {/* Bottom save */}
        <div className="mt-8 flex justify-end border-t border-white/10 pt-6">
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 border border-amber-500 bg-amber-500 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-black hover:bg-transparent hover:text-amber-500 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailSettingsPage;