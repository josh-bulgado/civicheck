import { Eye, Lock, Mail } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/components/ui/input-group";
import { GoogleIcon } from "./GoogleIcon";
import { RecaptchaNotice } from "./InvisibleCaptcha";
import { LoginLayout } from "./LoginLayout";

/** Session restoration disables the form; its fixed copy and artwork stay visible. */
export function LoginPageSkeleton() {
  return (
    <LoginLayout loading>
      <div className="login-form-content">
        <h1 className="login-title">Welcome back</h1>
        <FieldGroup className="login-fields">
          {[{ id: "email", label: "Email address", icon: Mail }, { id: "password", label: "Password", icon: Lock }].map(({ id, label, icon: Icon }) => (
            <Field key={id} className="login-field">
              <FieldLabel htmlFor={`loading-login-${id}`} className="sr-only">{label}</FieldLabel>
              <InputGroup shape="pill" fieldSize="touch" className="login-input">
                <InputGroupAddon><Icon aria-hidden="true" /></InputGroupAddon>
                <InputGroupInput id={`loading-login-${id}`} disabled placeholder={label} type={id === "password" ? "password" : "email"} />
                {id === "password" ? <InputGroupAddon align="inline-end"><Eye aria-hidden="true" /></InputGroupAddon> : null}
              </InputGroup>
            </Field>
          ))}
          <div className="login-options">
            <Field orientation="horizontal" className="w-auto">
              <Checkbox id="loading-keep-signed-in" disabled />
              <div className="login-session-label"><FieldLabel htmlFor="loading-keep-signed-in">Keep me signed in</FieldLabel></div>
            </Field>
            <span className="login-link">Forgot password?</span>
          </div>
          <div className="login-actions">
            <Button disabled data-size="invisible" shape="pill" size="touch" className="login-submit">Sign in</Button>
            <RecaptchaNotice />
            <div className="login-divider" aria-hidden="true"><span />or<span /></div>
            <Button disabled variant="outline" shape="pill" size="touch" className="login-google">
              <GoogleIcon className="login-google-icon" />Continue with Google
            </Button>
          </div>
        </FieldGroup>
        <div className="login-footer">New to CiviCheck?<span className="login-link">Create an account</span></div>
      </div>
    </LoginLayout>
  );
}
