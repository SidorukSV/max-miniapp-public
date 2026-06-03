/* eslint-disable react-refresh/only-export-components */
import { ChevronRight } from "lucide-react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function Stack({ children, className = "", gap = 12, direction = "column", style, ...props }) {
  return (
    <div
      className={cx("uiStack", className)}
      style={{
        "--stack-gap": typeof gap === "number" ? `${gap}px` : gap,
        "--stack-direction": direction,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function Flex({
  children,
  className = "",
  direction = "row",
  align,
  justify,
  gap = 0,
  wrap,
  style,
  ...props
}) {
  return (
    <div
      className={cx("uiFlex", className)}
      style={{
        flexDirection: direction,
        alignItems: align,
        justifyContent: justify,
        gap: typeof gap === "number" ? `${gap}px` : gap,
        flexWrap: wrap ? "wrap" : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function Container({ children, className = "", ...props }) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

function Title({ level = 2, children, className = "", ...props }) {
  const Tag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
  return (
    <Tag className={cx("uiTitle", `uiTitle--${level}`, className)} {...props}>
      {children}
    </Tag>
  );
}

function Label({ children, className = "", as: Tag = "span", ...props }) {
  const Component = Tag;
  return (
    <Component className={cx("uiLabel", className)} {...props}>
      {children}
    </Component>
  );
}

export const Typography = {
  Title,
  Label,
};

export function Button({
  children,
  className = "",
  mode = "primary",
  stretched = false,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={cx("uiButton", `uiButton--${mode}`, stretched && "uiButton--stretched", className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({ children, className = "", type = "button", ...props }) {
  return (
    <button type={type} className={cx("uiIconButton", className)} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className = "", ...props }) {
  return (
    <section className={cx("card", className)} {...props}>
      {children}
    </section>
  );
}

export function CellHeader({ children, className = "", ...props }) {
  const domProps = { ...props };
  delete domProps.titleStyle;

  return (
    <div className={cx("sectionHeader", className)} {...domProps}>
      {children}
    </div>
  );
}

export function CellList({ children, className = "", header = null, ...props }) {
  const domProps = { ...props };
  delete domProps.mode;
  delete domProps.filled;

  return (
    <div className={cx("cellList", className)} {...domProps}>
      {header}
      {children}
    </div>
  );
}

export function CellSimple({
  children,
  title,
  subtitle,
  before,
  after,
  showChevron = false,
  selected = false,
  disabled = false,
  className = "",
  onClick,
  ...props
}) {
  const domProps = { ...props };
  delete domProps.height;
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={cx("cellRow", selected && "cellRow--selected", disabled && "cellRow--disabled", className)}
      disabled={onClick ? disabled : undefined}
      onClick={disabled ? undefined : onClick}
      {...domProps}
    >
      {before ? <span className="cellRow__before">{before}</span> : null}
      <span className="cellRow__body">
        <span className="cellRow__title">{title || children}</span>
        {subtitle ? <span className="cellRow__subtitle">{subtitle}</span> : null}
      </span>
      {after ? <span className="cellRow__after">{after}</span> : null}
      {showChevron ? <ChevronRight className="cellRow__chevron" size={20} aria-hidden="true" /> : null}
    </Tag>
  );
}

export function Input({ className = "", ...props }) {
  const domProps = { ...props };
  delete domProps.mode;
  return <input className={cx("uiControl", className)} {...domProps} />;
}

export function SearchInput({ className = "", ...props }) {
  const domProps = { ...props };
  delete domProps.mode;
  return <input type="search" className={cx("uiControl", "uiControl--search", className)} {...domProps} />;
}

export function Textarea({ className = "", ...props }) {
  const domProps = { ...props };
  delete domProps.mode;
  return <textarea className={cx("uiControl", "uiTextarea", className)} {...domProps} />;
}

export function Switch({ className = "", ...props }) {
  return (
    <label className={cx("uiSwitch", className)}>
      <input type="checkbox" {...props} />
      <span className="uiSwitch__track" />
    </label>
  );
}

function AvatarContainer({ children, className = "", size = 56, style, ...props }) {
  return (
    <div
      className={cx("avatar", className)}
      style={{ width: size, height: size, minWidth: size, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}

function AvatarImage({ fallback = "", fallbackGradient = "pink", src = "", alt = "" }) {
  if (src) {
    return <img src={src} alt={alt} className="avatar__image" />;
  }

  return <span className={cx("avatar__fallback", `avatar__fallback--${fallbackGradient}`)}>{fallback}</span>;
}

export const Avatar = {
  Container: AvatarContainer,
  Image: AvatarImage,
};

export function EllipsisText({ children }) {
  return <span className="ellipsisText">{children}</span>;
}

export function Counter({ value }) {
  if (!value) return null;
  return <span className="counterBadge">{value}</span>;
}

export function StatusPill({ children, className = "" }) {
  return <span className={cx("statusPill", className)}>{children}</span>;
}
