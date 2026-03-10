'use client';

export type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  id: string;
  label: string;
  title?: string;
  value: T;
  options: Option<T>[];
  disabled?: boolean;
  layout?: 'inline' | 'stacked';
  wrapperClassName?: string;
  onChange: (next: T) => void;
};

export function TopMenuSelectField<T extends string>({
  id,
  label,
  title,
  value,
  options,
  disabled,
  layout = 'inline',
  wrapperClassName,
  onChange
}: Props<T>) {
  const cls = ['checkbox', layout === 'stacked' ? 'checkboxStacked' : '', wrapperClassName || '']
    .filter(Boolean)
    .join(' ');
  return (
    <label className={cls} title={title}>
      <span id={`${id}Prefix`}>{label}</span>
      <select
        id={id}
        className="select"
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value as T)}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
