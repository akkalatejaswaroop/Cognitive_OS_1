"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  HelpCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");

  const plans = [
    {
      name: "Solo",
      serifSubtitle: "essential workspace",
      price: { monthly: 0, annual: 0 },
      description: "Perfect for developers and researchers looking to manage a single, secure local workspace.",
      features: [
        "1 Active local workspace",
        "Basic swarm coordination",
        "Up to 1GB vector memory capacity",
        "Full offline capabilities",
        "Community support channel",
      ],
      cta: "Initialize Solo",
      highlighted: false,
    },
    {
      name: "Professional",
      serifSubtitle: "orchestrated workspace",
      price: { monthly: 24, annual: 19 },
      description: "For professionals running high-density agent networks and complex daily workflows.",
      features: [
        "Unlimited workspaces",
        "Premium coordinator agents",
        "Up to 10GB vector memory capacity",
        "Real-time reasoning logs & streaming",
        "Custom agent system parameters",
        "Priority development updates",
        "Direct email support (24hr response)",
      ],
      cta: "Initialize Pro",
      highlighted: true,
    },
    {
      name: "Enterprise",
      serifSubtitle: "autonomous workspace",
      price: { monthly: "Custom", annual: "Custom" },
      description: "Custom deployments engineered for teams requiring advanced security and custom model tuning.",
      features: [
        "Unlimited high-density workspaces",
        "Custom agent & model routing integrations",
        "Unlimited memory & volume configurations",
        "Dedicated corporate sandbox sync",
        "SLA guaranteed offline setup & deployment",
        "Custom security reviews & certifications",
        "Dedicated system architect support",
      ],
      cta: "Contact Architecture Sales",
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-grid font-sans selection:bg-primary/20 selection:text-foreground">
      {/* Background graphic blur */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none z-0">
        <div className="absolute top-1/4 right-10 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px] opacity-40 dark:opacity-20 animate-float" />
      </div>

      <MarketingHeader />

      <main className="flex-grow z-10">
        {/* Hero Area */}
        <section className="relative pt-20 pb-12 md:pt-28 md:pb-16 px-6 max-w-5xl mx-auto text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary mb-6"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Pricing Configurations
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl md:text-7xl tracking-tight leading-[1.05] font-display text-foreground max-w-3xl mb-8"
          >
            Transparent Plans. / <br />
            <span className="italic font-normal text-muted-foreground">Tailored to your setup.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-base md:text-lg text-muted-foreground max-w-2xl leading-[1.7] font-light mb-12"
          >
            Choose a pricing model that fits your compute scale. All paid subscriptions fund the core development of local security, speed integrations, and coordinator model fine-tunes.
          </motion.p>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="inline-flex items-center p-1 rounded-xl border border-border bg-card/60 backdrop-blur-sm"
          >
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`relative px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${
                billingCycle === "monthly"
                  ? "bg-foreground text-background dark:bg-[#FAF8F5] dark:text-[#1C1917]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`relative px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 ${
                billingCycle === "annual"
                  ? "bg-foreground text-background dark:bg-[#FAF8F5] dark:text-[#1C1917]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono uppercase tracking-normal">
                Save 20%
              </span>
            </button>
          </motion.div>
        </section>

        {/* Pricing Cards Grid */}
        <section className="pb-24 px-6 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => {
              const price = plan.price[billingCycle as keyof typeof plan.price];
              const isNumeric = typeof price === "number";

              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className={`group relative border rounded-2xl p-8 bg-card flex flex-col justify-between transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.02)] hover:shadow-xl ${
                    plan.highlighted
                      ? "border-primary ring-1 ring-primary"
                      : "border-border/60 hover:border-primary/30"
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1 bg-foreground text-background dark:bg-[#FAF8F5] dark:text-[#1C1917] text-[9px] font-bold uppercase tracking-wider rounded-full border border-border">
                      Most Selected Plan
                    </span>
                  )}

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold tracking-tight text-foreground">{plan.name}</h3>
                      <p className="font-display italic text-sm text-primary/75">{plan.serifSubtitle}</p>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed font-light">{plan.description}</p>

                    {/* Price display */}
                    <div className="py-4 border-y border-border/40 flex items-baseline gap-1">
                      {isNumeric ? (
                        <>
                          <span className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
                            ${price}
                          </span>
                          <span className="text-xs text-muted-foreground font-light">
                            / month {billingCycle === "annual" && "(billed annually)"}
                          </span>
                        </>
                      ) : (
                        <span className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                          {price}
                        </span>
                      )}
                    </div>

                    {/* Features checklist */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                        Included Features:
                      </p>
                      <ul className="space-y-2.5">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2.5 text-xs text-foreground font-light">
                            <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* CTA button */}
                  <div className="mt-8">
                    <button
                      className={`w-full py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                        plan.highlighted
                          ? "bg-foreground text-background dark:bg-[#FAF8F5] dark:text-[#1C1917] hover:opacity-90"
                          : "bg-transparent border border-border hover:border-primary/40 hover:bg-muted text-foreground"
                      }`}
                    >
                      {plan.cta}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Pricing FAQ Section */}
        <section className="py-20 md:py-24 border-t border-border/40 bg-card/10 relative">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3.5 block">
                F.A.Q.
              </span>
              <h2 className="text-3xl md:text-5xl font-display text-foreground leading-tight">
                Frequently Asked Questions <br />
                <span className="italic font-normal text-muted-foreground">concerning subscriptions.</span>
              </h2>
            </div>

            <div className="space-y-6">
              {[
                {
                  q: "Does my data leave my local system?",
                  a: "No. All core data indexing, agent logs, workspaces, and system databases stay entirely offline on your physical hardware. In the Professional hybrid mode, model queries can utilize remote endpoints under transport encryption, but local isolation remains fully supported.",
                },
                {
                  q: "Can I cancel or switch subscription levels at any time?",
                  a: "Certainly. You can transition between paid plans or downgrade to Solo through your billing panel. Downgrades take effect at the start of your next billing cycle.",
                },
                {
                  q: "Is there a custom discount for academic research or non-profits?",
                  a: "Yes. We offer specialized license discounts for students, academic researchers, and registered non-profit developers. Contact our architecture sales team to provision a validated license key.",
                },
              ].map((faq, idx) => (
                <div key={idx} className="p-6 bg-card border border-border/50 rounded-xl space-y-2.5">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                    {faq.q}
                  </h4>
                  <p className="text-xs text-muted-foreground font-light leading-relaxed pl-6">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
