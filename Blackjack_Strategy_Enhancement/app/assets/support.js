(() => {
  'use strict';
  const form = document.querySelector('#support-form');
  if (!form) return;
  const send = form.querySelector('[type="submit"]');
  const status = document.querySelector('#form-status');
  const message = form.elements.message;
  const count = document.querySelector('#message-count');
  const endpoint = form.dataset.endpoint || '';
  // Only the public opaque form ID belongs here. Never use an email endpoint.
  const configured = /^https:\/\/formspree\.io\/f\/[a-z0-9]+$/.test(endpoint);
  const fields = ['email', 'version', 'device', 'message'];
  const hints = {
    email: '请填写有效的回复邮箱，或留空。 / Enter a valid reply email, or leave blank.',
    version: '版本最多 64 个字符。 / Version must be 64 characters or fewer.',
    device: '设备信息最多 128 个字符。 / Device details must be 128 characters or fewer.',
    message: '请填写 10–5000 个字符的具体说明，不要只输入空格。 / Please enter 10–5000 characters, not just spaces.'
  };
  function validate(name) {
    const input = form.elements[name];
    let valid = input.validity.valid;
    if (name === 'message') valid = input.value.trim().length >= 10 && input.value.length <= 5000;
    if (name === 'email' && input.value.trim() !== input.value) valid = false;
    input.setAttribute('aria-invalid', String(!valid));
    document.querySelector(`#${name}-error`).textContent = valid ? '' : hints[name];
    return valid;
  }
  function updateCount() { count.textContent = `${message.value.length} / 5000`; }
  fields.forEach(name => {
    form.elements[name].addEventListener('blur', () => validate(name));
    form.elements[name].addEventListener('input', () => {
      if (form.elements[name].getAttribute('aria-invalid') === 'true') validate(name);
    });
  });
  message.addEventListener('input', updateCount);
  updateCount();
  if (configured) {
    form.action = endpoint;
    send.disabled = false;
    status.textContent = '发送时会前往 Formspree 完成人机验证并查看结果。 / Continue to Formspree to verify and see the submission result.';
  }
  // Native POST preserves Formspree's hosted CAPTCHA and quota/error pages.
  // The local page never equates opening that flow with successful delivery.
  form.noValidate = true;
  form.addEventListener('submit', event => {
    const invalid = fields.filter(name => !validate(name));
    if (invalid.length || !configured) {
      event.preventDefault();
      if (invalid.length) {
        status.textContent = '请先修改标注的项目；内容尚未发送。 / Fix the marked fields. Nothing has been sent.';
        form.elements[invalid[0]].focus();
      } else {
        status.textContent = '本地预览：尚未配置收件服务，内容没有发送。 / Local preview: delivery is not configured. Nothing was sent.';
      }
      return;
    }
    if (!form.elements.reference.value) {
      const bytes = new Uint8Array(8);
      crypto.getRandomValues(bytes);
      form.elements.reference.value = `7C-${Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
    }
    send.disabled = true;
    status.textContent = `正在前往验证页，并非收件确认。保留编号 ${form.elements.reference.value}。 / Opening verification, not a delivery confirmation. Keep this reference.`;
  });
  // Returning after a connection error or provider rejection keeps the draft editable.
  window.addEventListener('pageshow', () => {
    send.disabled = !configured;
    if (configured && form.elements.reference.value) {
      status.textContent = `编号 ${form.elements.reference.value}。如服务显示失败或额度限制，请保留内容并稍后重试；只有服务确认页代表已接受提交。 / If the service reports failure or a limit, keep your message and retry later. Only its confirmation page means the submission was accepted.`;
    }
    updateCount();
  });
})();
