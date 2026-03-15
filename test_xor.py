import os

XOR_KEY_HEX = os.environ.get("XOR_KEY_HEX", "4b6579")
XOR_KEY = bytes.fromhex(XOR_KEY_HEX)


def xor_encrypt_to_hex(plain_text: str, key: bytes) -> str:
    data = plain_text.encode("utf-8")
    cipher = bytes(b ^ key[i % len(key)] for i, b in enumerate(data))
    return cipher.hex()


def xor_decrypt_from_hex(cipher_hex: str, key: bytes) -> str:
    data = bytes.fromhex(cipher_hex)
    plain = bytes(b ^ key[i % len(key)] for i, b in enumerate(data))
    return plain.decode("utf-8", errors="replace")


if __name__ == "__main__":
    ejemplos = [
        "el perro duerme en el sofa y el gato mira por la ventana",
        "un pajaro vuela sobre el arbol y un perro corre por el jardin",
    ]

    for texto_claro in ejemplos:
        cipher_hex = xor_encrypt_to_hex(texto_claro, XOR_KEY)
        print("TEXTO:", texto_claro)
        print("HEX  :", cipher_hex)
        print("-" * 40)
