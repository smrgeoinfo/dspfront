<template>
  <v-container class="cz-user-guide">
    <div ref="markdownEl" class="markdown-body" v-html="renderedHtml" @click="handleAnchorClick" />
  </v-container>
</template>

<script lang="ts">
import MarkdownIt from 'markdown-it'
import { Component, toNative, Vue } from 'vue-facing-decorator'
import guideRaw from '~/assets/user-guide.md?raw'

const md = new MarkdownIt({ html: true, linkify: true })

// GitHub-style heading slug: lowercase, strip non-alphanumeric except spaces/hyphens, spaces→hyphens
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim()
}

md.renderer.rules.heading_open = (tokens, idx, options, _env, self) => {
  const token = tokens[idx]
  const contentToken = tokens[idx + 1]
  if (contentToken?.children) {
    const text = contentToken.children
      .filter(t => t.type === 'text' || t.type === 'code_inline')
      .map(t => t.content)
      .join('')
    token.attrSet('id', slugify(text))
  }
  return self.renderToken(tokens, idx, options)
}

@Component({
  name: 'cz-user-guide',
  components: {},
})
class CzUserGuide extends Vue {
  get renderedHtml() {
    return md.render(guideRaw)
  }

  handleAnchorClick(e: MouseEvent) {
    const anchor = (e.target as HTMLElement).closest('a')
    if (!anchor) return
    const href = anchor.getAttribute('href')
    if (!href?.startsWith('#')) return

    e.preventDefault()
    const target = document.getElementById(href.slice(1))
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' })
      history.replaceState(null, '', href)
    }
  }

  mounted() {
    const hash = window.location.hash
    if (hash) {
      this.$nextTick(() => {
        const target = document.getElementById(hash.slice(1))
        if (target) target.scrollIntoView({ behavior: 'smooth' })
      })
    }
  }
}
export default toNative(CzUserGuide)
</script>

<style lang="scss" scoped>
.cz-user-guide {
  max-width: 960px;
}

.markdown-body {
  :deep(h1) {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }

  :deep(h2) {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 2rem;
    margin-bottom: 0.75rem;
  }

  :deep(h3) {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
  }

  :deep(p) {
    margin-bottom: 0.75rem;
    line-height: 1.7;
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 1.5rem;
    margin-bottom: 0.75rem;
  }

  :deep(li) {
    margin-bottom: 0.25rem;
    line-height: 1.7;
  }

  :deep(a) {
    color: rgb(var(--v-theme-primary));
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  :deep(code) {
    background-color: rgba(0, 0, 0, 0.05);
    padding: 0.15em 0.4em;
    border-radius: 3px;
    font-size: 0.9em;
  }

  :deep(pre) {
    background-color: rgba(0, 0, 0, 0.05);
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    margin-bottom: 1rem;

    code {
      background: none;
      padding: 0;
    }
  }

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;

    th,
    td {
      border: 1px solid rgba(0, 0, 0, 0.12);
      padding: 0.5rem 0.75rem;
      text-align: left;
    }

    th {
      background-color: rgba(0, 0, 0, 0.04);
      font-weight: 600;
    }
  }

  :deep(hr) {
    border: none;
    border-top: 1px solid rgba(0, 0, 0, 0.12);
    margin: 2rem 0;
  }

  :deep(blockquote) {
    border-left: 4px solid rgba(0, 0, 0, 0.12);
    padding-left: 1rem;
    margin: 0.75rem 0;
    color: rgba(0, 0, 0, 0.6);
  }

  :deep(strong) {
    font-weight: 600;
  }
}
</style>
