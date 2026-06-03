import AppHeader from "./AppHeader.jsx";
import AppBottomBar from "./AppBottomBar.jsx";
import { Button } from "./ui.jsx";
import "../App.css";

export default function PageLayout({
  children,
  headerTitle = "",
  title = "",
  showTabs = true,
  showBottom,
  bottomButtonText,
  onBottomButtonClick,
  bottomButtonDisabled = false,
  showBottomButton = true,
  before = null,
  after = null,
}) {
  const shouldShowTabs = showBottom === undefined ? showTabs : Boolean(showBottom);
  const shouldShowAction = Boolean(bottomButtonText && showBottomButton);

  return (
    <div
      className={[
        "appShell",
        shouldShowTabs ? "appShell--tabs" : "",
        shouldShowAction ? "appShell--action" : "",
      ].filter(Boolean).join(" ")}
    >
      <AppHeader title={headerTitle || title} />
      <main className="page">{children}</main>

      {shouldShowAction ? (
        <footer className={`bottomActionBar ${shouldShowTabs ? "bottomActionBar--withTabs" : ""}`}>
          <div className="bottomActionBar__inner">
            {before ? <div className="bottomBefore">{before}</div> : null}
            <Button
              className="bottomPrimary"
              stretched
              onClick={onBottomButtonClick}
              disabled={bottomButtonDisabled}
            >
              {bottomButtonText}
            </Button>
            {after ? <div className="bottomAfter">{after}</div> : null}
          </div>
        </footer>
      ) : null}

      {shouldShowTabs ? <AppBottomBar /> : null}
    </div>
  );
}
