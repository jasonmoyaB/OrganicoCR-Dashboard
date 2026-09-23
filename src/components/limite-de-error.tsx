import { Component, type ReactNode } from "react";
import { AvisoError } from "./aviso-error";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Sin esto, un error al dibujar deja la pantalla en blanco sin decir nada.
// Es una clase porque React no tiene hook para atrapar errores de render.
export class LimiteDeError extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("La pantalla se rompió al dibujarse:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
        <AvisoError error={this.state.error} onReintentar={() => this.setState({ error: null })} />
      </div>
    );
  }
}
