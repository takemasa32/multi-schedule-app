import React from 'react';
import Link from 'next/link';

type TermsCheckboxProps = {
  isChecked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
};

export default function TermsCheckbox({ 
  isChecked, 
  onChange, 
  id = 'terms-checkbox' 
}: TermsCheckboxProps) {
  return (
    <div className="form-control my-4">
      <label className="label cursor-pointer justify-start gap-2">
        <input 
          type="checkbox" 
          id={id}
          className="checkbox checkbox-primary" 
          checked={isChecked} 
          onChange={(e) => onChange(e.target.checked)}
          required
        />
        <span className="label-text">
          <Link href="/terms" className="link link-primary" target="_blank" rel="noopener noreferrer">
            利用規約
          </Link>
          を読み、同意します
        </span>
      </label>
    </div>
  );
}