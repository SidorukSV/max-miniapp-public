import { Container, Button, Typography } from "@maxhub/max-ui";
import { useEffect, useState } from "react";
import "../App.css";

export default function AppBottomBar({
    buttonText,
    onButtonClick,
    buttonDisabled = false,
    showButton = true,
    before = null,
    after = null
}) {
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

    useEffect(() => {
        const viewport = window.visualViewport;
        if (!viewport) return undefined;

        const handleViewportResize = () => {
            setIsKeyboardOpen(viewport.height <= 410);
        };

        handleViewportResize();
        viewport.addEventListener("resize", handleViewportResize);

        return () => {
            viewport.removeEventListener("resize", handleViewportResize);
        };
    }, []);

    return (
        <footer className={`bottomBar ${isKeyboardOpen ? "bottomBar--hidden" : ""}`}>
            <Container className="bottomBarInner">
                {before && (
                    <div className="bottomBefore">
                        {before}
                    </div>
                )}
                {showButton && (
                    <Button className="bottomPrimary" onClick={onButtonClick} disabled={buttonDisabled}>
                        {buttonText}
                    </Button>
                )}
                {after && (
                    <div className="bottomAfter">
                        {after}
                    </div>
                )}
            </Container>
            <div className="bottomNote">
                <Typography.Label>
                    БИТ.Медицина / Омни. С заботой о пациентах
                </Typography.Label>
            </div>
        </footer>
    );
}
