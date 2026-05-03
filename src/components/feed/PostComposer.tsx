import { Button } from "../ui/Button";

type PostComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function PostComposer({ value, onChange, onSubmit }: PostComposerProps) {
  return (
    <div className="inline-actions mt-2 flex gap-2">
      <input
        className="goi-field flex-1 min-w-0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Escribe un comentario"
      />
      <Button type="button" variant="secondary" onClick={onSubmit}>
        Comentar
      </Button>
    </div>
  );
}
