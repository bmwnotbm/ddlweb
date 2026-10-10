import { CartProvider } from "../context/CartContext";
import { AuthProvider } from "../context/AuthContext";
import Header from "../components/Header";
import ChatWidget from "../components/ChatWidget";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="min-h-screen bg-paper">
          <Header />
          <main className="mx-auto max-w-5xl px-6 pb-24 pt-10">
            <Component {...pageProps} />
          </main>
          <ChatWidget />
        </div>
      </CartProvider>
    </AuthProvider>
  );
}
