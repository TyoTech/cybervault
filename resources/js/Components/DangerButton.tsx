import { ButtonHTMLAttributes } from 'react';
import Button from '@/Components/UI/Button';

export default function DangerButton({
    className = '',
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <Button variant="danger" className={className} {...props}>
            {children}
        </Button>
    );
}