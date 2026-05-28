import { useState } from "react";
import { Typography } from "@maxhub/max-ui";
import { ChevronRight, MessageCircle, Phone } from "lucide-react";

const SWIPE_CLOSE_DISTANCE = 96;

export default function AppointmentOptionsSheet({
    open,
    onlineCount,
    offlineSpecs,
    loading,
    error,
    onClose,
    onOnlineBook,
    onPhoneCall,
    onOpenChat,
}) {
    const [dragStartY, setDragStartY] = useState(null);
    const [dragOffset, setDragOffset] = useState(0);

    if (!open) return null;

    function handleTouchStart(event) {
        setDragStartY(event.touches[0]?.clientY ?? null);
    }

    function handleTouchMove(event) {
        if (dragStartY === null) return;
        const nextOffset = (event.touches[0]?.clientY ?? dragStartY) - dragStartY;
        setDragOffset(nextOffset > 0 ? nextOffset : 0);
    }

    function handleTouchEnd() {
        if (dragOffset > SWIPE_CLOSE_DISTANCE) {
            onClose();
        }

        setDragStartY(null);
        setDragOffset(0);
    }

    return (
        <div className="appointmentSheetBackdrop" onClick={onClose}>
            <div
                className="appointmentSheet"
                onClick={(event) => event.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ transform: `translateY(${dragOffset}px)` }}
            >
                <div className="appointmentSheetHandle" />
                {onlineCount > 0 && (
                    <button
                        type="button"
                        className="appointmentRow appointmentRow--chevron"
                        onClick={onOnlineBook}
                    >
                        <div>
                            <Typography.Title level={2}>Запись на прием врача</Typography.Title>
                            <Typography.Label className="roleLine">Онлайн-запись на удобное время</Typography.Label>
                        </div>
                        <ChevronRight size={24} />
                    </button>
                )}

                {offlineSpecs.map((spec) => (
                    <div key={spec.id} className="appointmentRow">
                        <div>
                            <Typography.Title level={2}>{spec.title}</Typography.Title>
                            <Typography.Label className="roleLine">
                                {spec.appointmentType === "phone_and_chat" ? "Запись по телефону или в чате" : "Запись по телефону"}
                            </Typography.Label>
                        </div>
                        <div className="appointmentRowActions">
                            <button
                                type="button"
                                className="appointmentIconButton"
                                onClick={() => onPhoneCall(spec.appointmentPhone)}
                                aria-label={`Позвонить по специальности ${spec.title}`}
                                disabled={!spec.appointmentPhone}
                            >
                                <Phone size={22} />
                            </button>
                            {spec.appointmentType === "phone_and_chat" && (
                                <button
                                    type="button"
                                    className="appointmentIconButton"
                                    onClick={onOpenChat}
                                    aria-label={`Открыть чат для специальности ${spec.title}`}
                                >
                                    <MessageCircle size={22} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {loading && <Typography.Label className="roleLine">Загрузка...</Typography.Label>}
                {error && <Typography.Label className="authErrorLabel">{error}</Typography.Label>}
            </div>
        </div>
    );
}
