export default function Pill({ active, children, onClick, disabled = false }) {
    return (
        <button
            type="button"
            className={`pill ${active ? "pill--active" : ""}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
}
