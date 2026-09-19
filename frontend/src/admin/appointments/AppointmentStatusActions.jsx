const ACTIONS_BY_STATUS = {
  pending: ["confirm", "reschedule", "cancel"],
  confirmed: ["complete", "no_show", "reschedule", "cancel"],
  completed: [],
  cancelled: [],
  no_show: [],
};

const BUTTON_META = {
  confirm: { label: "Confirm", variant: "primary" },
  complete: { label: "Mark Complete", variant: "primary" },
  no_show: { label: "Mark No-show", variant: "muted" },
  reschedule: { label: "Reschedule", variant: "muted" },
  cancel: { label: "Cancel", variant: "danger" },
};

const variantClass = {
  primary:
    "border border-amber-500 bg-amber-500 text-black hover:bg-transparent hover:text-amber-500",
  muted:
    "border border-white/10 text-[#8f897e] hover:border-amber-500 hover:text-amber-500",
  danger:
    "border border-red-400/40 text-red-400/80 hover:border-red-400 hover:text-red-400",
};

const AppointmentStatusActions = ({
  status,
  onConfirm,
  onComplete,
  onNoShow,
  onRescheduleRequest,
  onCancelRequest,
}) => {
  const actions = ACTIONS_BY_STATUS[status] ?? [];

  const HANDLERS = {
    confirm: onConfirm,
    complete: onComplete,
    no_show: onNoShow,
    reschedule: onRescheduleRequest,
    cancel: onCancelRequest,
  };

  if (!actions.length) {
    return (
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#625f58]">
        No status actions available
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((key) => (
        <button
          key={key}
          type="button"
          onClick={HANDLERS[key]}
          className={`px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-all ${variantClass[BUTTON_META[key].variant]}`}
        >
          {BUTTON_META[key].label}
        </button>
      ))}
    </div>
  );
};

export default AppointmentStatusActions;