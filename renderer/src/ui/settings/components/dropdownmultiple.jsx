import React from "@modules/react";

import Arrow from "@ui/icons/downarrow";
import Checkmark from "@ui/icons/check";

const {useState, useCallback} = React;


export default function MultipleSelect({values: initialValues, options, style, onChange, onClick, disabled, placeholder = "Select options"}) {
    const [values, setValues] = useState(initialValues ?? [options[0].value]);
    const change = useCallback((value, event) => {
        event.preventDefault();
        event.stopPropagation();

        const isChecked = !values.includes(value);
        const newValues = isChecked
            ? [...values, value]
            : values.filter(v => v !== value);

        const newValuesRef = {current: newValues};
        onChange?.(value, isChecked, newValuesRef);
        setValues(newValuesRef.current);
    }, [onChange, values]);


    const hideMenu = useCallback(() => {
        setOpen(false);
        document.removeEventListener("click", hideMenu);
    }, []);

    const [open, setOpen] = useState(false);
    const showMenu = useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();

        if (disabled) return;

        const next = !open;
        onClick?.(next);
        setOpen(next);
        if (!next) return;
        document.addEventListener("click", hideMenu);
    }, [hideMenu, open, disabled, onClick]);


    // Display static text or placeholder based on selection count
    const displayText = values.length === 0 ? placeholder :
                       values.length === 1 ? options.find(o => o.value === values[0])?.label || placeholder :
                       `${values.length} options selected`;

    const optionComponents = <div className="bd-select-options">
            {options.map(opt =>
                <div key={opt.value} className={`bd-select-option${values.includes(opt.value) ? " selected" : ""}`} onClick={(event) => change(opt.value, event)}>
                    <div className="bd-select-option-value">{opt.label}</div>
                    {values.includes(opt.value) && <Checkmark className="bd-select-checkmark" size="14px" />}
                </div>
            )}
        </div>;

    const styleClass = style == "transparent" ? " bd-select-transparent" : "";
    const isOpen = open ? " menu-open" : "";
    const isDisabled = disabled ? " bd-select-disabled" : "";
    return <div className={`bd-select${styleClass}${isOpen}${isDisabled}`} onClick={showMenu}>
                <div className="bd-select-value">{displayText}</div>
                <Arrow className="bd-select-arrow" size="24px" flip={open} />
                {open && optionComponents}
            </div>;
}
