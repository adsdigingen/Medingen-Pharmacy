import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
}) => {
  const footer = (
    <>
      <Button
        variant={variant === 'danger' ? 'danger' : 'primary'}
        onClick={() => {
          onConfirm();
          onClose();
        }}
      >
        {confirmText}
      </Button>
      <Button variant="outline" onClick={onClose}>
        {cancelText}
      </Button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer} maxWidth="max-w-md">
      <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
    </Modal>
  );
};
