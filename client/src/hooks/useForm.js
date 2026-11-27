import { useState } from "react";

export default function useForm(initialValues, validate) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setValues((v) => ({ ...v, [name]: type === "checkbox" ? checked : value }));
    setErrors((er) => (er[name] ? { ...er, [name]: undefined } : er));
  };

  // returns true when valid, otherwise fills `errors`
  const runValidation = () => {
    const found = validate(values);
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  return { values, setValues, errors, setErrors, handleChange, runValidation };
}
