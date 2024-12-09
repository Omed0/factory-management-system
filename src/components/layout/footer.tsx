import { Button } from '@/components/ui/button';

export const Footer = () => {
  return (
    <footer className="text-muted-foreground mt-auto w-full text-center text-sm">
      پەرەیپێدراوە لەلایەن{' '}
      <Button variant="link" className="p-0" asChild>
        <a href="https://github.com/Omed0" target="_blank">
          Omed Akram
        </a>
      </Button>{' '}
      © {new Date().getFullYear()}
    </footer>
  );
};
