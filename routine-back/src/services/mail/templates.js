import { env } from "../../config/env.js";

/**
 * E-mail texts (pt-BR). Each returns `{ subject, text, html }`. Links carry the
 * token after "#", so it never reaches a server log or a Referer header.
 */

const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const appLink = (path, token) => `${env.APP_ORIGIN}${path}${token ? `#token=${token}` : ""}`;

/** Plain layout: greeting, paragraphs, one button, a closing note. */
function layout({ name, paragraphs, button, note }) {
  const text = [`Olá, ${name}!`, "", ...paragraphs.flatMap((p) => [p, ""]), ...(button ? [`${button.label}: ${button.href}`, ""] : []), ...(note ? [note, ""] : []), "— nuCorre"].join("\n");
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:24px;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1d2230">
<div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e3e6ec;border-radius:12px;padding:28px">
<p style="margin:0 0 16px;font-size:16px">Olá, ${escape(name)}!</p>
${paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.5">${escape(p)}</p>`).join("\n")}
${button ? `<p style="margin:22px 0"><a href="${escape(button.href)}" style="display:inline-block;background:#4f5bd5;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;font-size:15px">${escape(button.label)}</a></p>
<p style="margin:0 0 14px;font-size:12.5px;color:#6b7280;word-break:break-all">Se o botão não abrir, copie este endereço: ${escape(button.href)}</p>` : ""}
${note ? `<p style="margin:18px 0 0;font-size:13px;color:#6b7280">${escape(note)}</p>` : ""}
<p style="margin:22px 0 0;font-size:13px;color:#6b7280">— nuCorre</p>
</div></body></html>`;
  return { text, html };
}

export function verifyEmail({ name, token }) {
  return {
    subject: "Confirme seu e-mail no nuCorre",
    ...layout({
      name,
      paragraphs: ["Falta só um passo para usar sua conta: confirme que este e-mail é seu."],
      button: { label: "Confirmar e-mail", href: appLink("/confirmar-email", token) },
      note: "O link vale por 24 horas. Se você não criou uma conta no nuCorre, ignore este e-mail.",
    }),
  };
}

/** Someone tried to sign up with an address that already has an account. */
export function accountExists({ name }) {
  return {
    subject: "Você já tem uma conta no nuCorre",
    ...layout({
      name,
      paragraphs: ["Alguém tentou criar uma conta com este e-mail, mas ele já está cadastrado.", "Se foi você, é só entrar. Se esqueceu a senha, peça uma nova na tela de entrada."],
      button: { label: "Entrar no nuCorre", href: appLink("/login") },
      note: "Se não foi você, ignore este e-mail: nada mudou na sua conta.",
    }),
  };
}

export function resetPassword({ name, token }) {
  return {
    subject: "Redefinir sua senha do nuCorre",
    ...layout({
      name,
      paragraphs: ["Recebemos um pedido para criar uma nova senha para a sua conta."],
      button: { label: "Criar nova senha", href: appLink("/redefinir-senha", token) },
      note: "O link vale por 30 minutos e só funciona uma vez. Se você não pediu, ignore este e-mail: sua senha continua a mesma.",
    }),
  };
}

export function confirmNewEmail({ name, token }) {
  return {
    subject: "Confirme seu novo e-mail no nuCorre",
    ...layout({
      name,
      paragraphs: ["Você pediu para usar este endereço na sua conta do nuCorre. Confirme para concluir a troca."],
      button: { label: "Confirmar novo e-mail", href: appLink("/confirmar-novo-email", token) },
      note: "O link vale por 1 hora. Se você não pediu, ignore este e-mail.",
    }),
  };
}

/** Sent to the old address when someone asks to change it. */
export function emailChangeRequested({ name, newEmail }) {
  return {
    subject: "Pedido para trocar o e-mail da sua conta",
    ...layout({
      name,
      paragraphs: [`Pediram para trocar o e-mail da sua conta do nuCorre para ${newEmail}. A troca só acontece quando o novo endereço for confirmado.`],
      note: "Se não foi você, troque sua senha agora em Configurações → Perfil.",
    }),
  };
}

export function twoFactorEnabled({ name }) {
  return {
    subject: "Verificação em duas etapas ativada",
    ...layout({
      name,
      paragraphs: [
        "A verificação em duas etapas foi ativada na sua conta do nuCorre. A partir de agora, ao entrar, além da senha será pedido o código do app autenticador.",
        "Os outros aparelhos conectados foram desconectados.",
      ],
      note: "Se não foi você, troque sua senha agora e desative a verificação em Configurações → Segurança.",
    }),
  };
}

export function twoFactorDisabled({ name }) {
  return {
    subject: "Verificação em duas etapas desativada",
    ...layout({
      name,
      paragraphs: ["A verificação em duas etapas foi desativada na sua conta do nuCorre. Agora basta a senha para entrar."],
      note: "Se não foi você, troque sua senha agora e ative a verificação de novo em Configurações → Segurança.",
    }),
  };
}

/** A recovery code was used to sign in or confirm an action. */
export function recoveryCodeUsed({ name, left }) {
  return {
    subject: "Um código de recuperação foi usado",
    ...layout({
      name,
      paragraphs: [
        "Um dos seus códigos de recuperação da verificação em duas etapas acabou de ser usado.",
        left > 0 ? `Restam ${left} código(s). Se estiver acabando, gere novos em Configurações → Segurança.` : "Não restam códigos. Gere novos em Configurações → Segurança.",
      ],
      note: "Se não foi você, troque sua senha agora.",
    }),
  };
}

export function accountDeleted({ name }) {
  return {
    subject: "Sua conta do nuCorre foi excluída",
    ...layout({
      name,
      paragraphs: ["Sua conta e todos os dados dela foram excluídos do nuCorre, como você pediu. Isso não pode ser desfeito."],
      note: "Se não foi você quem pediu, responda este e-mail.",
    }),
  };
}

/** Sent after a password reset by e-mail. */
export function passwordChanged({ name }) {
  return {
    subject: "Sua senha do nuCorre foi alterada",
    ...layout({
      name,
      paragraphs: ["A senha da sua conta acabou de ser redefinida, e todos os aparelhos foram desconectados."],
      note: "Se não foi você, peça uma nova senha na tela de entrada imediatamente.",
    }),
  };
}

/** To each admin: someone confirmed their e-mail and is waiting to be let in. */
export function approvalRequested({ name, applicantName, applicantEmail }) {
  return {
    subject: `${applicantName} quer entrar no nuCorre`,
    ...layout({
      name,
      paragraphs: [`${applicantName} (${applicantEmail}) criou uma conta e confirmou o e-mail. Ela só consegue entrar depois que você liberar.`],
      button: { label: "Ver pedidos", href: appLink("/configuracoes/usuarios") },
      note: "Se você não conhece essa pessoa, recuse o pedido: a conta é excluída.",
    }),
  };
}

/** The account was let in by an admin. */
export function accountApproved({ name }) {
  return {
    subject: "Sua conta do nuCorre foi liberada",
    ...layout({
      name,
      paragraphs: ["Boa notícia: sua conta foi aprovada. Já dá para entrar e começar a organizar o seu mês."],
      button: { label: "Entrar no nuCorre", href: appLink("/login") },
    }),
  };
}
