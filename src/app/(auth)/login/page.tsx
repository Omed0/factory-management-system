import { Metadata } from "next";
import LoginForm from "./login-form"

type Props = {}

export default function LoginPage({ }: Props) {
    return (
        <main>
            <LoginForm />
        </main>
    )
}



export const generateMetadata = (): Metadata => ({
    title: "Login Page",
    description: "Login Page Factory System Management",
});