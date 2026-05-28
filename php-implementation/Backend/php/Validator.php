<?php

declare(strict_types=1);

/**
 * Dedicated input validator.
 * Spec requirement: do not rely on the database to reject bad data.
 * All validation is done here before any DB query runs.
 */
class Validator
{
    private array $errors = [];

    // ── String rules ──────────────────────────────────────────────────────────

    public function required(string $field, mixed $value): self
    {
        if ($value === null || trim((string)$value) === '') {
            $this->errors[$field] = "{$field} is required.";
        }
        return $this;
    }

    public function minLength(string $field, mixed $value, int $min): self
    {
        if (isset($this->errors[$field])) return $this;
        if (mb_strlen(trim((string)$value)) < $min) {
            $this->errors[$field] = "{$field} must be at least {$min} characters.";
        }
        return $this;
    }

    public function maxLength(string $field, mixed $value, int $max): self
    {
        if (isset($this->errors[$field])) return $this;
        if (mb_strlen(trim((string)$value)) > $max) {
            $this->errors[$field] = "{$field} must be at most {$max} characters.";
        }
        return $this;
    }

    // ── Type / format rules ───────────────────────────────────────────────────

    public function email(string $field, mixed $value): self
    {
        if (isset($this->errors[$field])) return $this;
        if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field] = "{$field} must be a valid email address.";
        }
        return $this;
    }

    public function positiveInt(string $field, mixed $value): self
    {
        if (isset($this->errors[$field])) return $this;
        if (!is_numeric($value) || (int)$value <= 0) {
            $this->errors[$field] = "{$field} must be a positive integer.";
        }
        return $this;
    }

    // ── Result ────────────────────────────────────────────────────────────────

    public function passes(): bool
    {
        return empty($this->errors);
    }

    public function fails(): bool
    {
        return !empty($this->errors);
    }

    /** Returns the first error message found. */
    public function firstError(): string
    {
        return array_values($this->errors)[0] ?? 'Validation failed.';
    }

    /** Returns all errors keyed by field name. */
    public function errors(): array
    {
        return $this->errors;
    }
}
