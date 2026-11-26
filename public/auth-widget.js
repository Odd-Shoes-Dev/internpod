// Shared sign-in / sign-up widget — Google + email verification code.
// Loaded on every page; each page just calls window.AuthWidget.open().
;(function () {
  const COLORS = {
    black: '#1a1a1a', white: '#ffffff', cream: '#f8f6f2',
    coral: '#e05a3a', coralHover: '#c94e30',
    gray200: '#ebebeb', gray300: '#d4d4d4', gray500: '#888', gray600: '#666', gray700: '#444',
  }

  let state = { mode: null, email: null, onSuccess: null }
  let built = false
  let els = {}

  function injectStyles() {
    const style = document.createElement('style')
    style.textContent = `
#aw-overlay{position:fixed;inset:0;background:rgba(26,26,26,.55);display:none;align-items:center;justify-content:center;z-index:9999;padding:20px;font-family:'DM Sans',-apple-system,sans-serif}
#aw-overlay.open{display:flex}
#aw-card{background:${COLORS.white};border-radius:16px;padding:36px 32px;width:100%;max-width:380px;box-shadow:0 24px 80px rgba(0,0,0,.25);position:relative}
#aw-close{position:absolute;top:14px;right:14px;background:none;border:none;cursor:pointer;color:${COLORS.gray500};font-size:1.1rem;line-height:1;padding:6px}
#aw-close:hover{color:${COLORS.black}}
#aw-title{font-family:'Playfair Display',Georgia,serif;font-size:1.4rem;font-weight:600;color:${COLORS.black};margin-bottom:6px}
#aw-sub{font-size:.85rem;color:${COLORS.gray500};margin-bottom:24px;line-height:1.5}
.aw-btn-google{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:13px;border:1.5px solid ${COLORS.gray200};border-radius:9px;background:${COLORS.white};font-size:.92rem;font-weight:600;color:${COLORS.black};cursor:pointer;transition:all .2s}
.aw-btn-google:hover{border-color:${COLORS.black}}
.aw-divider{display:flex;align-items:center;gap:12px;margin:20px 0;color:${COLORS.gray500};font-size:.78rem}
.aw-divider::before,.aw-divider::after{content:'';flex:1;height:1px;background:${COLORS.gray200}}
.aw-field{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
.aw-field label{font-size:.78rem;font-weight:600;color:${COLORS.gray700}}
.aw-field input{padding:12px 13px;border:1.5px solid ${COLORS.gray200};border-radius:9px;font-size:.92rem;color:${COLORS.black};outline:none;transition:border-color .2s}
.aw-field input:focus{border-color:${COLORS.coral}}
.aw-btn-primary{width:100%;padding:13px;border:none;border-radius:9px;background:${COLORS.coral};color:${COLORS.white};font-size:.92rem;font-weight:700;cursor:pointer;transition:background .2s}
.aw-btn-primary:hover{background:${COLORS.coralHover}}
.aw-btn-primary:disabled{opacity:.6;cursor:not-allowed}
#aw-error{color:${COLORS.coral};font-size:.8rem;margin-top:10px;display:none;line-height:1.5}
#aw-resend{display:block;text-align:center;margin-top:16px;font-size:.8rem;color:${COLORS.gray600};cursor:pointer;background:none;border:none;width:100%}
#aw-resend:hover{color:${COLORS.coral}}
#aw-back{display:block;text-align:center;margin-top:8px;font-size:.78rem;color:${COLORS.gray500};cursor:pointer;background:none;border:none;width:100%}
.aw-step{display:none}
.aw-step.active{display:block}
`
    document.head.appendChild(style)
  }

  function injectMarkup() {
    const overlay = document.createElement('div')
    overlay.id = 'aw-overlay'
    overlay.innerHTML = `
<div id="aw-card">
  <button id="aw-close" aria-label="Close">✕</button>

  <div class="aw-step active" id="aw-step-email">
    <div id="aw-title">Sign in to Blue Ox Jobs</div>
    <div id="aw-sub">Continue with Google, or your email address.</div>
    <button class="aw-btn-google" id="aw-google-btn">
      <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
      Continue with Google
    </button>
    <div class="aw-divider">or</div>
    <div class="aw-field">
      <label for="aw-email-input">Email address</label>
      <input type="email" id="aw-email-input" placeholder="you@example.com" autocomplete="email">
    </div>
    <button class="aw-btn-primary" id="aw-email-continue">Continue with email</button>
  </div>

  <div class="aw-step" id="aw-step-code">
    <div id="aw-title">Check your email</div>
    <div id="aw-sub" id="aw-code-sub">Enter the code we sent you.</div>
    <div class="aw-field">
      <label for="aw-code-input">Verification code</label>
      <input type="text" inputmode="numeric" id="aw-code-input" placeholder="123456" autocomplete="one-time-code">
    </div>
    <button class="aw-btn-primary" id="aw-code-verify">Verify</button>
    <button id="aw-resend">Resend code</button>
    <button id="aw-back">← Use a different email</button>
  </div>

  <div id="aw-error"></div>
</div>`
    document.body.appendChild(overlay)

    els = {
      overlay,
      stepEmail: overlay.querySelector('#aw-step-email'),
      stepCode: overlay.querySelector('#aw-step-code'),
      codeSub: overlay.querySelector('#aw-code-sub'),
      emailInput: overlay.querySelector('#aw-email-input'),
      codeInput: overlay.querySelector('#aw-code-input'),
      error: overlay.querySelector('#aw-error'),
      googleBtn: overlay.querySelector('#aw-google-btn'),
      emailContinue: overlay.querySelector('#aw-email-continue'),
      codeVerify: overlay.querySelector('#aw-code-verify'),
      resend: overlay.querySelector('#aw-resend'),
      back: overlay.querySelector('#aw-back'),
      close: overlay.querySelector('#aw-close'),
    }

    els.close.addEventListener('click', close)
    overlay.addEventListener('click', e => { if (e.target === overlay) close() })
    els.googleBtn.addEventListener('click', handleGoogle)
    els.emailContinue.addEventListener('click', handleEmailContinue)
    els.codeVerify.addEventListener('click', handleCodeVerify)
    els.resend.addEventListener('click', handleResend)
    els.back.addEventListener('click', showEmailStep)
    els.emailInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleEmailContinue() })
    els.codeInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleCodeVerify() })
  }

  function build() {
    if (built) return
    injectStyles()
    injectMarkup()
    built = true
  }

  function showError(msg) {
    els.error.textContent = msg
    els.error.style.display = 'block'
  }
  function clearError() {
    els.error.style.display = 'none'
    els.error.textContent = ''
  }
  function setBusy(btn, busy, label) {
    btn.disabled = busy
    if (label) btn.textContent = busy ? label : btn.dataset.label
  }

  function showEmailStep() {
    clearError()
    state.mode = null
    els.stepCode.classList.remove('active')
    els.stepEmail.classList.add('active')
    els.codeInput.value = ''
  }
  function showCodeStep(email) {
    clearError()
    els.codeSub.textContent = `We sent a 6-digit code to ${email}.`
    els.stepEmail.classList.remove('active')
    els.stepCode.classList.add('active')
    els.codeInput.focus()
  }

  async function handleGoogle() {
    clearError()
    try {
      await window.Clerk.client.signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: window.location.origin + '/sso-callback',
        redirectUrlComplete: window.location.href,
      })
    } catch (e) {
      showError(e.message || 'Could not start Google sign-in.')
    }
  }

  async function handleEmailContinue() {
    clearError()
    const email = els.emailInput.value.trim()
    if (!email || !email.includes('@')) {
      showError('Enter a valid email address.')
      return
    }
    els.emailContinue.dataset.label = els.emailContinue.textContent
    setBusy(els.emailContinue, true, 'Sending code…')
    try {
      const signIn = await window.Clerk.client.signIn.create({ identifier: email })
      const factor = signIn.supportedFirstFactors?.find(f => f.strategy === 'email_code')
      if (!factor) throw new Error('Email code sign-in is not available for this account.')
      await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId })
      state.mode = 'signin'
      state.email = email
      showCodeStep(email)
    } catch (e) {
      const code = e.errors?.[0]?.code
      if (code === 'form_identifier_not_found') {
        try {
          await window.Clerk.client.signUp.create({ emailAddress: email })
          await window.Clerk.client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
          state.mode = 'signup'
          state.email = email
          showCodeStep(email)
        } catch (e2) {
          showError(e2.errors?.[0]?.message || e2.message || 'Could not start sign-up.')
        }
      } else {
        showError(e.errors?.[0]?.message || e.message || 'Something went wrong.')
      }
    } finally {
      setBusy(els.emailContinue, false)
    }
  }

  async function handleCodeVerify() {
    clearError()
    const code = els.codeInput.value.trim()
    if (!code) { showError('Enter the code from your email.'); return }
    els.codeVerify.dataset.label = els.codeVerify.textContent
    setBusy(els.codeVerify, true, 'Verifying…')
    try {
      let result
      if (state.mode === 'signin') {
        result = await window.Clerk.client.signIn.attemptFirstFactor({ strategy: 'email_code', code })
      } else {
        result = await window.Clerk.client.signUp.attemptEmailAddressVerification({ code })
      }
      if (result.status === 'complete' && result.createdSessionId) {
        await window.Clerk.setActive({ session: result.createdSessionId })
        close()
        if (typeof state.onSuccess === 'function') state.onSuccess()
        else location.reload()
      } else {
        showError('Could not complete sign-in. Please try again.')
      }
    } catch (e) {
      showError(e.errors?.[0]?.message || e.message || 'Invalid or expired code.')
    } finally {
      setBusy(els.codeVerify, false)
    }
  }

  async function handleResend() {
    clearError()
    try {
      if (state.mode === 'signin') {
        const signIn = window.Clerk.client.signIn
        const factor = signIn.supportedFirstFactors?.find(f => f.strategy === 'email_code')
        await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId })
      } else {
        await window.Clerk.client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      }
      showError('Code resent.')
    } catch (e) {
      showError(e.message || 'Could not resend code.')
    }
  }

  function open(opts) {
    build()
    state = { mode: null, email: null, onSuccess: opts && opts.onSuccess }
    showEmailStep()
    els.emailInput.value = ''
    els.overlay.classList.add('open')
    els.emailInput.focus()
  }
  function close() {
    if (els.overlay) els.overlay.classList.remove('open')
  }

  window.AuthWidget = { open, close }
})()
