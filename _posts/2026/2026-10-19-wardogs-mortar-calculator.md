---
title: "WARDOGS: a mortar range calculator"
categories: ["games", "tools", "wardogs"]
---

In WARDOGS the mortar and the artillery tank have no ballistics computer. You get
a direction marker and a **RNG** dial, and it's up to you to work out the range. You can guess
and walk your shells onto the target, but every miss tells the enemy where your mortar is.

[This video](https://www.youtube.com/watch?v=9X8U-eHCMgI) explains the exact method. On the map,
right-click → *Mark coordinates* on your mortar and then on the target. One map unit is 100 m,
so the range is plain Pythagoras:

```
range = √((x₁ − x₂)² + (y₁ − y₂)²) × 100 m
```

The author even says *"hopefully someone out there makes a website that can calculate it, you just
paste it in"*. So here it is:

<p style="margin:1.5em 0;">
  <a href="/wardogs-mortar/" style="display:inline-block;background:#c52f21;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;">Open the mortar calculator&nbsp;→</a>
</p>

- Paste the line exactly as the game gives it (`x98.53, y110.38`). Typing just the two numbers works too.
- Your own position is remembered. The mortar doesn't move, so for each new target you only paste the target.
- It shows whether the target is within mortar range (up to ~700 m) or artillery range (~750–2630 m).

- It also gives the compass heading (`000 N`, `090 E`, `251 W`…), so you can turn straight to it without a map marker.

Turn to the heading, set RNG to the range and fire. You can still middle-click the target on the map
and check that the diamond is in the middle of your sight.

<iframe src="/wardogs-mortar/" title="WARDOGS mortar calculator" loading="lazy" style="width:100%;height:720px;border:1px solid #e7e5e4;border-radius:14px;background:#f5f5f4;margin-top:.5em;"></iframe>
