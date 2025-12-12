// app/admin/menu/modifiers/components/modifier-modal.tsx

"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type ModifierOptionForm = {
  id?: string;
  name: string;
  price: number | string | null;
};

export type ModifierFormValues = {
  id?: string;
  name: string;
  min_choices: number;
  max_choices: number;
  options: ModifierOptionForm[];
};

const EMPTY_OPTION: ModifierOptionForm = { name: "", price: null };

const EMPTY_VALUES: ModifierFormValues = {
  name: "",
  min_choices: 0,
  max_choices: 1,
  options: [EMPTY_OPTION],
};

type ModifierModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValues?: ModifierFormValues;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: ModifierFormValues) => Promise<void> | void;
};

export function ModifierModal({
  open,
  mode,
  initialValues,
  loading,
  onClose,
  onSubmit,
}: ModifierModalProps) {
  const [values, setValues] = useState<ModifierFormValues>(
    initialValues ? { ...EMPTY_VALUES, ...initialValues } : { ...EMPTY_VALUES }
  );

  useEffect(() => {
    if (open) {
      setValues(initialValues ? { ...EMPTY_VALUES, ...initialValues } : { ...EMPTY_VALUES });
    }
  }, [open, initialValues]);

  const addOption = () => {
    setValues((prev) => ({
      ...prev,
      options: [...prev.options, { ...EMPTY_OPTION }],
    }));
  };

  const removeOption = (index: number) => {
    setValues((prev) => {
      if (prev.options.length === 1) return prev;
      return {
        ...prev,
        options: prev.options.filter((_, i) => i !== index),
      };
    });
  };

  const updateOption = (index: number, patch: Partial<ModifierOptionForm>) => {
    setValues((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) =>
        i === index ? { ...opt, ...patch } : opt
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.name.trim()) {
      alert("Name is required");
      return;
    }
    if (values.max_choices < values.min_choices) {
      alert("Max choices must be greater than or equal to min choices");
      return;
    }
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !loading && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create modifier group" : "Edit modifier group"}</DialogTitle>
          <DialogDescription>
            Configure choices customers can pick when ordering this item.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
              disabled={loading}
              placeholder="e.g. Choose your side"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="min_choices">Min choices</Label>
              <Input
                id="min_choices"
                type="number"
                min={0}
                value={values.min_choices}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    min_choices: Number(e.target.value) || 0,
                  }))
                }
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_choices">Max choices</Label>
              <Input
                id="max_choices"
                type="number"
                min={1}
                value={values.max_choices}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    max_choices: Number(e.target.value) || 1,
                  }))
                }
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Options</Label>
            <div className="space-y-3">
              {values.options.map((option, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-2 rounded-lg border p-3 md:grid-cols-[2fr,1fr,auto]"
                >
                  <Input
                    placeholder="Option name"
                    value={option.name}
                    onChange={(e) =>
                      updateOption(index, { name: e.target.value })
                    }
                    disabled={loading}
                  />
                  <Input
                    placeholder="Price (optional)"
                    type="number"
                    value={option.price ?? ""}
                    onChange={(e) =>
                      updateOption(index, {
                        price: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeOption(index)}
                    disabled={loading || values.options.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOption}
              disabled={loading}
            >
              Add option
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : mode === "create" ? "Create group" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
