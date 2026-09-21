import { ButtonHTMLAttributes } from 'react';
import Button from '@/Components/UI/Button';

export default function SecondaryButton({
    className = '',
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <Button variant="secondary" className={className} {...props}>
            {children}
        </Button>
    );
}