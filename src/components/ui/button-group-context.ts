import * as React from "react";
import type { ButtonVariantProps } from "~/components/ui/button";

export type ButtonGroupStyle = Pick<
  ButtonVariantProps,
  "variant" | "size" | "shape"
>;

const ButtonGroupStyleContext = React.createContext<ButtonGroupStyle>({});

function useButtonGroupStyle() {
  return React.useContext(ButtonGroupStyleContext);
}

export { ButtonGroupStyleContext, useButtonGroupStyle };
