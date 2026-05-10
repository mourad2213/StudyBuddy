import "./FormInput.css";

const FormInput = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  required = false,
}) => {
  return (
    <div className="sb-form-field">
      <label className="sb-form-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        className="sb-form-input"
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        required={required}
      />
    </div>
  );
};

export default FormInput;
