import { Panel, Container } from "@maxhub/max-ui";
import AppHeader from "./AppHeader";
import AppBottomBar from "./AppBottomBar";
import "../App.css";

export default function PageLayout({
    children,
    headerTitle = "",
    logoSrc = `${import.meta.env.BASE_URL}${import.meta.env.VITE_LOGO_PATH}`,
    showBottom = true,
    bottomButtonText,
    onBottomButtonClick,
    bottomButtonDisabled = false,
    showBottomButton = true,
    before = null,
    after = null,
    roundedLogo = false
}) {
    return (
        <Panel mode="secondary" className="panel">
            <AppHeader title={headerTitle} logoSrc={logoSrc} roundedLogo={roundedLogo} />
            <Container className="page">{children}</Container>
            {showBottom && (
                <AppBottomBar
                    buttonText={bottomButtonText}
                    onButtonClick={onBottomButtonClick}
                    buttonDisabled={bottomButtonDisabled}
                    showButton={showBottomButton}
                    before={before}
                    after={after}
                />
            )}
        </Panel>
    );
}
