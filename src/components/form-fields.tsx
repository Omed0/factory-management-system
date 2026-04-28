import * as React from 'react';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';

interface FieldBase { form: any; name: string; label: string; }

export function TextField({ form, name, label, type = 'text', required, placeholder }: FieldBase & { type?: string; required?: boolean; placeholder?: string }) {
  return (
    <form.Field name={name}>
      {(f: any) => (
        <div className="grid gap-1.5">
          <Label htmlFor={name}>{label}{required && <span className="text-destructive"> *</span>}</Label>
          <Input
            id={name}
            type={type}
            required={required}
            placeholder={placeholder}
            value={f.state.value ?? ''}
            onChange={(e) => f.handleChange(type === 'number' ? Number(e.target.value) : e.target.value)}
            onBlur={f.handleBlur}
          />
          {f.state.meta.isTouched && f.state.meta.errors?.[0] && (
            <p className="text-xs text-destructive">{String(f.state.meta.errors[0])}</p>
          )}
        </div>
      )}
    </form.Field>
  );
}

export function TextAreaField({ form, name, label, rows = 3 }: FieldBase & { rows?: number }) {
  return (
    <form.Field name={name}>
      {(f: any) => (
        <div className="grid gap-1.5">
          <Label htmlFor={name}>{label}</Label>
          <Textarea
            id={name}
            rows={rows}
            value={f.state.value ?? ''}
            onChange={(e) => f.handleChange(e.target.value)}
            onBlur={f.handleBlur}
          />
          {f.state.meta.isTouched && f.state.meta.errors?.[0] && (
            <p className="text-xs text-destructive">{String(f.state.meta.errors[0])}</p>
          )}
        </div>
      )}
    </form.Field>
  );
}

export function SelectField<T extends string>({ form, name, label, options }: FieldBase & { options: { value: T; label: string }[] }) {
  return (
    <form.Field name={name}>
      {(f: any) => (
        <div className="grid gap-1.5">
          <Label>{label}</Label>
          <Select value={String(f.state.value)} onValueChange={(v) => f.handleChange(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {options.map((o) => <SelectItem key={String(o.value)} value={String(o.value)}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </form.Field>
  );
}
