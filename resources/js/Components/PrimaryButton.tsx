import { ButtonHTMLAttributes } from 'react';
import Button from '@/Components/UI/Button';

export default function PrimaryButton({
    className = '',
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <Button variant="primary" className={className} {...props}>
            {children}
        </Button>
    );
}